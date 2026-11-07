# Security policy

## Supported versions

Security fixes target the latest release. Please use the latest release when checking whether a vulnerability still occurs.

## Report a vulnerability

Report security vulnerabilities privately through **Report a vulnerability** under the repository's [Security tab](https://github.com/Metonya/pano/security). Do not report vulnerabilities in public issues or pull requests.

Include:

- The affected version and installation method, operating system, and relevant configuration.
- Steps to reproduce, a minimal example, and the expected and actual behavior.
- The potential impact and any workaround you have found.

Remove tokens, personal data, and other secrets from examples and logs. This is a small project: responses and fixes are best effort, with no promised deadline.

## Security model

Pano is local-first and binds to loopback (`127.0.0.1`) by default, without requiring a token. Beyond loopback, `PANO_TOKEN` is required for the API and MCP, except in the explicit local Docker mode.

Local Docker mode (`PANO_LOCAL_DOCKER=1`) requires a port published only on host loopback. It trusts local processes and containers that can reach its Docker network. Host and Origin checks protect browser access; they do not authenticate those processes or containers. Do not expose this mode to a LAN, reverse proxy, or untrusted Docker network.

For remote access, omit `PANO_LOCAL_DOCKER`, set a strong `PANO_TOKEN`, and use an authenticated HTTPS reverse proxy. See [installation and configuration](README.md#installation) for details.
