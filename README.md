# PrismNote

> **Modern data science notebook with production-quality UI.** SQL/Spark execution, 8 cloud warehouses, enterprise auth, VSCode-inspired interface.

![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen.svg)
![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![Tests](https://img.shields.io/badge/Tests-149%20Passing-brightgreen.svg)
![Distribution](https://img.shields.io/badge/Distribution-Wheels--Only-blue.svg)
![License](https://img.shields.io/badge/License-Proprietary-red.svg)

---

## Product Overview

**PrismNote** is a proprietary, production-grade data science notebook. Modern UI inspired by Deepnote, direct execution against SQL and Spark warehouses, enterprise-ready.

### Why Data Teams Choose This

**The Problem**:
- Jupyter notebooks are outdated UI
- Moving between notebook and IDE is friction
- SQL isn't first-class in notebooks
- Authentication and multi-user is complex

**The Solution**:
- Deepnote-quality modern UI
- Native SQL/Spark execution
- 8 warehouse integrations (BigQuery, Snowflake, Redshift, etc.)
- Enterprise authentication (SAML, SSO)
- VSCode-inspired layout

**Result**: Ship notebooks faster, collaborate better, never leave your editor.

---

## Installation

```bash
pip install prismnote
# or with uv
uv pip install prismnote
```

### Requirements
- Python 3.10+
- Node.js 16+ (for UI server)

### Distribution Model

**Proprietary-first distribution**:
- ✅ Wheels-only via PyPI (no source code)
- ✅ Production-grade notebook platform
- ✅ 149 comprehensive tests
- ✅ Used in production data teams

---

## Quick Start

```bash
# Start PrismNote server
prismnote server --port 8080

# Open http://localhost:8080
# Create notebook, execute SQL directly against your warehouse
```

---

## Features

- **Modern UI**: Deepnote-quality interface
- **SQL Native**: Execute SQL directly in cells
- **Spark Support**: DataFrame operations
- **8 Warehouses**: BigQuery, Snowflake, Redshift, PostgreSQL, MySQL, DuckDB, SQLite, Databricks
- **Enterprise Auth**: SAML, SSO, LDAP
- **Real-time Collaboration**: Multi-user notebooks
- **Integrated Terminal**: Shell access within notebook
- **File Browser**: Navigate data files
- **VS Code Layout**: Familiar interface

---

## Quality & Testing

- **149 tests** passing
- **Production-grade** — used in data teams
- **Modern** — built with latest web tech

---

## Support

For production deployments: **mullassery@gmail.com**

---

**Version**: 1.6.0  
**License**: Proprietary  
**Distribution**: Wheels-only via PyPI  
**Python**: 3.10+  

Built for modern data science.
