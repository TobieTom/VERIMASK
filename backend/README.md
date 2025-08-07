# VeriMask - Blockchain-Based Identity Verification System

Welcome to **VeriMask**, a blockchain-based identity verification system for financial services. This project combines **React** for the frontend, **Django** for the backend, and **Ethereum blockchain** for secure document verification.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
  - [Backend (Django)](#backend-django)
  - [Frontend (React)](#frontend-react)
  - [Blockchain (Ethereum)](#blockchain-ethereum)
- [Running the System](#running-the-system)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+**
- **Node.js 16+**
- **PostgreSQL**
- **Redis** (for Celery and Django Channels)
- **MetaMask** (for blockchain interactions)
- **Git**

## Setup Instructions

### 1. Backend (Django)

#### Clone the repository:

```bash
git clone https://github.com/your-username/VeriMask.git
cd VeriMask/backend
```

#### Create a virtual environment and activate it:

```bash
python -m venv blockchain_venv
source blockchain_venv/bin/activate  # On Windows: blockchain_venv\Scripts\activate
```

#### Install dependencies:

```bash
pip install -r requirements.txt
```
```bash
cd backend
```

#### Set up the database:

1. Create a **PostgreSQL database** named `verimask`.
2. Update the database settings in `settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'verimask',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

#### Run migrations:

```bash
python manage.py migrate
```

#### Create a superuser:

```bash
python manage.py createsuperuser
```

#### Set up environment variables:

Create a `.env` file in the **backend** directory and add the following:

```env
SECRET_KEY=your_secret_key
DEBUG=True
DATABASE_URL=postgres://your_db_user:your_db_password@localhost:5432/verimask
WEB3_PROVIDER=http://localhost:7545  # Local Ethereum node
CONTRACT_ADDRESS=your_contract_address
ETHEREUM_PRIVATE_KEY=your_private_key
```

---

### 2. Frontend (React)

#### Navigate to the frontend directory:

```bash
cd ../frontend
```

#### Install dependencies:

```bash
npm install
```

#### Set up environment variables:

Create a `.env` file in the **frontend** directory and add:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1/
```

---

### 3. Blockchain (Ethereum)

- Ensure you have **Ganache** or **Hardhat** running for a local Ethereum blockchain.
- Deploy the **smart contract** and update the `CONTRACT_ADDRESS` in the `.env` file.

---

## Running the System

### 1. Backend

#### Start the Django development server:

```bash
python manage.py runserver
```

#### Start Celery for background tasks:

```bash
celery -A backend worker --loglevel=info
```

#### Start Redis (required for Celery and Django Channels):

```bash
redis-server
```

#### Start Daphne for WebSocket support:

```bash
daphne backend.asgi:application
```

---

### 2. Frontend

#### Start the React development server:

```bash
npm run dev
```

#### Open your browser and navigate to:

```
http://localhost:5173
```

---

### 3. Blockchain

- Ensure your local Ethereum node (e.g., **Ganache**) is running.
- Connect your **MetaMask wallet** to the local Ethereum node.

---

## Testing

### 1. Backend Tests

Run Django tests:

```bash
python manage.py test
```

### 2. Frontend Tests

Run React tests:

```bash
npm test
```

---

## Troubleshooting

### 1. Database Issues

- Ensure **PostgreSQL** is running and the database credentials are correct.
- Run:

```bash
python manage.py migrate
```

### 2. Blockchain Issues

- Ensure your local Ethereum node is running and **MetaMask** is connected.
- Verify the `CONTRACT_ADDRESS` and `ETHEREUM_PRIVATE_KEY` in the `.env` file.

### 3. Frontend Issues

- Ensure the `VITE_API_BASE_URL` in the `.env` file points to the correct backend URL.

---

## Contributing

If you'd like to contribute to this project, please follow these steps:

1. **Fork** the repository.
2. **Create a new branch** for your feature or bugfix.
3. **Submit a pull request** with a detailed description of your changes.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Contact

For any questions or issues, feel free to reach out:

📧 **Email:** [your-email@example.com](mailto\:your-email@example.com)

🐙 **GitHub:** [your-username](https://github.com/your-username)

---

Enjoy using **VeriMask**! 🚀

