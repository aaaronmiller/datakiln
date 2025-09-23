// Simple test to check workflow editor functionality
console.log('Testing workflow editor...');

// Wait for page to load
setTimeout(() => {
  // Navigate to workflows page
  window.location.href = '/#/workflows';

  setTimeout(() => {
    console.log('On workflows page');

    // Find and click New Workflow button
    const buttons = Array.from(document.querySelectorAll('button'));
    const newWorkflowButton = buttons.find(btn => btn.textContent && btn.textContent.includes('New Workflow'));

    if (newWorkflowButton) {
      console.log('Found New Workflow button, clicking...');
      newWorkflowButton.click();

      setTimeout(() => {
        console.log('Clicked New Workflow button');

        // Check if we're on the editor page
        if (window.location.href.includes('/workflows/new')) {
          console.log('Successfully navigated to workflow editor');

          // Check for ReactFlow elements
          const reactFlowElements = document.querySelectorAll('.react-flow, [class*="react-flow"], .reactflow-wrapper');
          console.log('ReactFlow elements found:', reactFlowElements.length);

          // Check for node toolbar
          const toolbarButtons = document.querySelectorAll('button[class*="bg-"]');
          console.log('Toolbar buttons found:', toolbarButtons.length);

          // Check for canvas
          const canvas = document.querySelector('div[style*="height"], div[class*="h-full"]');
          console.log('Canvas element found:', !!canvas);

          // Try to add a node
          if (toolbarButtons.length > 0) {
            console.log('Clicking first toolbar button to add node...');
            toolbarButtons[0].click();

            setTimeout(() => {
              // Check if node was added
              const nodes = document.querySelectorAll('[class*="node"], [class*="Node"]');
              console.log('Nodes found after clicking toolbar:', nodes.length);

              // Check for node handles
              const handles = document.querySelectorAll('[class*="handle"], [data-handleid]');
              console.log('Node handles found:', handles.length);

            }, 1000);
          }

        } else {
          console.log('Failed to navigate to workflow editor. Current URL:', window.location.href);
        }
      }, 2000);
    } else {
      console.log('New Workflow button not found');
      console.log('Available buttons:', buttons.map(btn => btn.textContent).filter(Boolean));
    }
  }, 2000);
}, 1000);