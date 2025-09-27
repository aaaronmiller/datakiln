from typing import Dict, Any, Optional, Union, List
from pydantic import Field
from .base_node import BaseNode
import asyncio
from datetime import datetime, timedelta
import uuid


class WaitNode(BaseNode):
    """Node for waiting on manual approval or external signals"""

    type: str = "wait"

    # Wait configuration
    wait_type: str = Field("manual_approval", description="Type of wait: 'manual_approval', 'external_signal', 'condition'")
    timeout_seconds: Optional[float] = Field(None, ge=0, description="Maximum wait time in seconds (None = no timeout)")

    # Manual approval configuration
    approval_message: str = Field(..., description="Message to display for approval request")
    approver_roles: Optional[List[str]] = Field(None, description="Required roles for approval")
    approval_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID for this approval request")

    # External signal configuration
    signal_key: Optional[str] = Field(None, description="Key to wait for in external signals")
    signal_source: Optional[str] = Field(None, description="Source of external signal")

    # Condition-based wait
    wait_condition: Optional[str] = Field(None, description="Python expression to wait for (condition type)")

    # Notification settings
    notify_on_wait: bool = Field(True, description="Send notification when entering wait state")
    notify_channels: List[str] = Field(default_factory=lambda: ["websocket"], description="Channels to send notifications")

    # Auto-approval conditions
    auto_approve_conditions: Optional[List[str]] = Field(None, description="Conditions that auto-approve the wait")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute wait logic"""
        try:
            # Check for auto-approval
            if self._check_auto_approval(context):
                return {
                    "wait_completed": True,
                    "auto_approved": True,
                    "reason": "auto_approval_condition_met",
                    "timestamp": datetime.now().isoformat()
                }

            # Send wait notification
            if self.notify_on_wait:
                await self._send_wait_notification(context)

            # Execute wait based on type
            if self.wait_type == "manual_approval":
                result = await self._wait_for_manual_approval(context)
            elif self.wait_type == "external_signal":
                result = await self._wait_for_external_signal(context)
            elif self.wait_type == "condition":
                result = await self._wait_for_condition(context)
            else:
                raise ValueError(f"Unknown wait type: {self.wait_type}")

            result.update({
                "wait_type": self.wait_type,
                "wait_duration": result.get("wait_duration", 0),
                "timestamp": datetime.now().isoformat()
            })

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Wait execution failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _check_auto_approval(self, context: Dict[str, Any]) -> bool:
        """Check if wait should be auto-approved"""
        if not self.auto_approve_conditions:
            return False

        try:
            eval_context = self._build_evaluation_context(context)

            for condition in self.auto_approve_conditions:
                result = eval(condition, {"__builtins__": {}}, eval_context)
                if result:
                    return True

            return False

        except Exception:
            return False

    async def _wait_for_manual_approval(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Wait for manual approval"""
        start_time = datetime.now()

        # Create approval request
        approval_request = {
            "id": self.approval_id,
            "node_id": self.id,
            "message": self.approval_message,
            "requested_at": start_time.isoformat(),
            "required_roles": self.approver_roles,
            "status": "pending"
        }

        # Store approval request in context for external access
        if "pending_approvals" not in context.get("execution_data", {}):
            context["execution_data"]["pending_approvals"] = {}
        context["execution_data"]["pending_approvals"][self.approval_id] = approval_request

        # Wait loop with timeout
        timeout = self.timeout_seconds or 3600  # Default 1 hour
        wait_interval = 1.0  # Check every second

        elapsed = 0
        while elapsed < timeout:
            await asyncio.sleep(wait_interval)
            elapsed += wait_interval

            # Check if approval granted
            current_status = context["execution_data"]["pending_approvals"].get(self.approval_id, {}).get("status")
            if current_status == "approved":
                end_time = datetime.now()
                return {
                    "wait_completed": True,
                    "approval_granted": True,
                    "wait_duration": (end_time - start_time).total_seconds(),
                    "approved_by": approval_request.get("approved_by"),
                    "approval_timestamp": approval_request.get("approved_at")
                }
            elif current_status == "rejected":
                raise ValueError(f"Approval request rejected: {approval_request.get('rejection_reason', 'Unknown reason')}")

        # Timeout
        approval_request["status"] = "timeout"
        raise asyncio.TimeoutError(f"Manual approval timeout after {timeout} seconds")

    async def _wait_for_external_signal(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Wait for external signal"""
        if not self.signal_key:
            raise ValueError("signal_key required for external_signal wait type")

        start_time = datetime.now()
        timeout = self.timeout_seconds or 300  # Default 5 minutes
        wait_interval = 0.5  # Check every 0.5 seconds

        elapsed = 0
        while elapsed < timeout:
            await asyncio.sleep(wait_interval)
            elapsed += wait_interval

            # Check for signal in context
            signals = context.get("execution_data", {}).get("external_signals", {})
            if self.signal_key in signals:
                signal_data = signals[self.signal_key]
                end_time = datetime.now()
                return {
                    "wait_completed": True,
                    "signal_received": True,
                    "signal_key": self.signal_key,
                    "signal_data": signal_data,
                    "wait_duration": (end_time - start_time).total_seconds()
                }

        raise asyncio.TimeoutError(f"External signal timeout after {timeout} seconds")

    async def _wait_for_condition(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Wait for condition to be met"""
        if not self.wait_condition:
            raise ValueError("wait_condition required for condition wait type")

        start_time = datetime.now()
        timeout = self.timeout_seconds or 600  # Default 10 minutes
        wait_interval = 1.0  # Check every second

        elapsed = 0
        while elapsed < timeout:
            await asyncio.sleep(wait_interval)
            elapsed += wait_interval

            # Evaluate condition
            try:
                eval_context = self._build_evaluation_context(context)
                result = eval(self.wait_condition, {"__builtins__": {}}, eval_context)

                if result:
                    end_time = datetime.now()
                    return {
                        "wait_completed": True,
                        "condition_met": True,
                        "condition": self.wait_condition,
                        "wait_duration": (end_time - start_time).total_seconds()
                    }
            except Exception as e:
                # Log evaluation error but continue waiting
                print(f"Condition evaluation error: {str(e)}")

        raise asyncio.TimeoutError(f"Condition wait timeout after {timeout} seconds")

    def _build_evaluation_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Build evaluation context for conditions"""
        return {
            "node": self,
            "context": context,
            "inputs": self.inputs,
            "workflow_data": context.get("execution_data", {}),
            "pending_approvals": context.get("execution_data", {}).get("pending_approvals", {}),
            "external_signals": context.get("execution_data", {}).get("external_signals", {}),
            "datetime": datetime,
            "timedelta": timedelta
        }

    async def _send_wait_notification(self, context: Dict[str, Any]):
        """Send notification about entering wait state"""
        try:
            # Get notification callback from context
            on_execution_event = context.get("on_execution_event")
            if not on_execution_event:
                return

            execution_id = context.get("execution_data", {}).get("execution_options", {}).get("execution_id", "unknown")

            notification_data = {
                "execution_id": execution_id,
                "node_id": self.id,
                "node_type": self.type,
                "wait_type": self.wait_type,
                "message": self.approval_message if self.wait_type == "manual_approval" else f"Waiting for {self.wait_type}",
                "approval_id": self.approval_id if self.wait_type == "manual_approval" else None,
                "timestamp": datetime.now().isoformat()
            }

            await on_execution_event("node_waiting", notification_data)

        except Exception as e:
            # Don't fail execution for notification errors
            print(f"Wait notification failed: {str(e)}")

    @classmethod
    def approve_wait(cls, approval_id: str, approved: bool, approved_by: Optional[str] = None,
                    rejection_reason: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        """Class method to approve or reject a wait from external source"""
        if not context or "execution_data" not in context:
            return False

        pending_approvals = context["execution_data"].get("pending_approvals", {})
        if approval_id not in pending_approvals:
            return False

        approval = pending_approvals[approval_id]
        if approved:
            approval.update({
                "status": "approved",
                "approved_by": approved_by,
                "approved_at": datetime.now().isoformat()
            })
        else:
            approval.update({
                "status": "rejected",
                "rejected_by": approved_by,
                "rejection_reason": rejection_reason,
                "rejected_at": datetime.now().isoformat()
            })

        return True