# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in microbot, please report it by:

1. **DO NOT** open a public GitHub issue
2. Create a [private security advisory](https://github.com/Luvu182/microbot/security/advisories/new) on GitHub
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond to security reports within 48 hours.

## Security Best Practices

### API Key Management

**CRITICAL**: Never commit API keys to version control.

```bash
# Good: Store in config file with restricted permissions
chmod 600 ~/.microbot/config.json

# Bad: Hardcoding keys in code or committing them
```

### Channel Access Control

Always configure `allowFrom` lists for production use. See upstream [nanobot security docs](https://github.com/HKUDS/nanobot/blob/main/SECURITY.md) for detailed security guidelines.

### Production Deployment

1. Run in a container or VM
2. Use a dedicated non-root user
3. Set proper file permissions (700 for config dirs, 600 for config files)
4. Keep dependencies updated
5. Monitor logs for unusual activity

## Upstream Security

This project is based on [nanobot](https://github.com/HKUDS/nanobot). For comprehensive security documentation, refer to the [upstream SECURITY.md](https://github.com/HKUDS/nanobot/blob/main/SECURITY.md).

## License

See LICENSE file for details.
