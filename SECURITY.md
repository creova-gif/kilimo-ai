# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it privately — **do not open a public issue**.

**Contact:** creativeinnovationspace@gmail.com

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any relevant logs, screenshots, or proof-of-concept code

You should receive an acknowledgment within a reasonable timeframe. This is a small team — please be patient, but we take security reports seriously and will prioritize accordingly.

## Scope

This applies to the code in this repository. It does not cover third-party dependencies (report those upstream) or infrastructure outside this repo's control.

## Handling Credentials

- Never commit `.env` files, API keys, tokens, or any other credentials to this repository.
- If you believe you've found a credential committed to git history, report it via the contact above rather than opening a public issue — the fix requires history rewriting, not just deletion of the current file.
- Check `.gitignore` before adding any new file that stores configuration or secrets.

## Disclosure

We aim to handle reports responsibly and will credit reporters (with permission) once a fix is released, unless anonymity is requested.
