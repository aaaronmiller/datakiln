---
Type: Reference | Status: Active | Completion: 85%
---

# User Manual

## Welcome to DataKiln

DataKiln is a powerful visual workflow management system for AI-driven research and data processing. This manual will guide you through using the platform effectively.

## Getting Started

### System Requirements
- **Operating System**: macOS 12+, Windows 10+, Linux (Ubuntu 18.04+)
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+
- **RAM**: Minimum 8GB, recommended 16GB+
- **Storage**: 2GB free space for application and data

### Installation
1. Download the latest release from the project repository
2. Run the setup script appropriate for your platform:
   ```bash
   # macOS/Linux
   ./setup.sh

   # Windows
   setup.bat
   ```
3. Follow the on-screen prompts to configure your environment

### Initial Configuration
1. **API Keys**: Configure your AI provider API keys in Settings
2. **Obsidian Vault**: Set your vault path for automatic file storage
3. **Chrome Extension**: Install and configure for chat capture
4. **Browser Setup**: Ensure Chrome/Chromium is available for automation

## Core Workflows

### Research Execution

#### Starting a Research Query
1. Navigate to the Dashboard
2. Click "New Research" or select a template
3. Choose your research mode:
   - **Fast**: Quick surface scan (1-3 minutes)
   - **Balanced**: Moderate depth (3-6 minutes)
   - **Comprehensive**: Deep analysis (5-12 minutes)
4. Enter your research query
5. Click "Start Research"

#### Monitoring Progress
- Real-time progress updates in the status panel
- Research tree visualization shows exploration path
- Log output displays detailed execution information
- Cancel option available during execution

#### Viewing Results
- Results display in multiple formats (table, JSON, markdown)
- Export options for different file types
- Automatic save to configured Obsidian vault
- Research tree JSON for analysis

### Workflow Building

#### Creating Custom Workflows
1. Access the Workflow Builder from the main navigation
2. Drag nodes from the palette onto the canvas:
   - **DataSource**: Import data from various sources
   - **Filter**: Apply filtering conditions
   - **Transform**: Modify data structure
   - **Aggregate**: Group and summarize data
   - **Join**: Combine multiple data streams
   - **QueryNode**: Execute research queries
3. Connect nodes by dragging from output to input handles
4. Configure each node's parameters in the properties panel
5. Save your workflow for reuse

#### Managing Workflows
- **Save**: Store workflows with custom names
- **Load**: Retrieve saved workflows from library
- **Duplicate**: Create copies for modification
- **Export/Import**: Share workflows between instances
- **Version History**: Track changes over time

### Data Capture

#### Chat Export with Chrome Extension
1. Install the DataKiln Chrome extension
2. Navigate to supported AI chat platforms
3. Click the extension icon during or after conversations
4. Select content and export format
5. Files automatically download and move to vault

#### YouTube Transcript Analysis
1. Find the YouTube video URL
2. Use the transcript extraction tool
3. Review the generated analysis
4. Optionally combine with deep research
5. Results save to your Obsidian vault

## Advanced Features

### Batch Operations
- Queue multiple research queries
- Set execution priorities
- Monitor batch progress across all jobs
- Automatic retry for failed operations
- Consolidated results reporting

### Real-time Collaboration
- Share workflows with team members
- Live editing with conflict resolution
- Comment and annotation system
- Version control and change tracking

### Advanced Node Types
- **Custom Nodes**: Build reusable components
- **Conditional Logic**: Branch workflows based on conditions
- **Loop Operations**: Iterate over data collections
- **External Integrations**: Connect to APIs and services

## Configuration and Settings

### API Provider Setup
```json
{
  "gemini": {
    "api_key": "your_gemini_key",
    "model": "gemini-pro"
  },
  "perplexity": {
    "api_key": "your_perplexity_key"
  }
}
```
- Configure multiple providers for redundancy
- Set rate limits and retry policies
- Test connections before use

### Obsidian Integration
- Set vault path: `/Users/username/Documents/Obsidian/MyVault`
- Configure YAML frontmatter templates
- Set up automatic file organization
- Enable conflict resolution for duplicate files

### Browser Automation
- Selector configuration for different UI versions
- Retry policies for transient failures
- Screenshot capture for debugging
- Performance optimization settings

## Troubleshooting

### Common Issues

#### Research Not Starting
- **Check**: API keys are configured and valid
- **Check**: Network connectivity to AI providers
- **Check**: Browser automation permissions
- **Solution**: Verify configuration in Settings panel

#### Workflow Not Saving
- **Check**: Sufficient disk space available
- **Check**: File permissions for data directory
- **Check**: JSON syntax in workflow definition
- **Solution**: Clear browser cache and retry

#### Chrome Extension Not Working
- **Check**: Extension is installed and enabled
- **Check**: Supported website detection
- **Check**: Download permissions granted
- **Solution**: Reinstall extension and refresh pages

#### Obsidian Files Not Appearing
- **Check**: Vault path is correctly configured
- **Check**: Obsidian is not locking files
- **Check**: File mover daemon is running
- **Solution**: Restart file mover service

### Performance Optimization
- Close unnecessary browser tabs during automation
- Limit concurrent operations based on system resources
- Use Fast mode for time-sensitive queries
- Clear old log files regularly

### Logs and Debugging
- Access logs through the Settings panel
- Enable debug mode for detailed tracing
- Export logs for support requests
- Check browser developer console for errors

## Best Practices

### Research Workflow
1. **Start Small**: Use Fast mode to validate queries
2. **Iterate**: Refine queries based on initial results
3. **Combine Sources**: Use transcript analysis with deep research
4. **Document Process**: Save successful workflows as templates

### Data Management
1. **Organize Vault**: Use consistent folder structures
2. **Tag Content**: Apply YAML tags for better searchability
3. **Version Control**: Keep important workflows under version control
4. **Backup Regularly**: Export critical workflows and configurations

### System Maintenance
1. **Update Regularly**: Keep the application and dependencies updated
2. **Monitor Resources**: Watch system resource usage during intensive operations
3. **Clean Up**: Remove old logs and temporary files
4. **Test Backups**: Verify backup and restore procedures

## API Reference

### REST API Endpoints
- `GET /api/workflows` - List saved workflows
- `POST /api/workflows` - Create new workflow
- `GET /api/workflows/{id}` - Get workflow details
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow

### WebSocket Events
- `workflow:start` - Workflow execution started
- `workflow:progress` - Progress update with percentage
- `workflow:complete` - Execution completed with results
- `workflow:error` - Error occurred during execution

## Support and Resources

### Getting Help
- Check this manual first for common issues
- Review the troubleshooting section
- Check logs for error details
- Contact support with specific error messages

### Community Resources
- Project documentation on GitHub
- Community forums for user discussions
- Video tutorials for complex workflows
- Template library for common use cases

### Development
- Source code available on GitHub
- Contribution guidelines for developers
- API documentation for integrations
- Plugin development resources

---

This user manual is continuously updated. Check for the latest version in your installation or online repository.