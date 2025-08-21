# Payment Checkout Application

A modern payment checkout page built with Next.js, TypeScript, and shadcn/ui components. This application replicates a professional payment interface similar to modern payment processors.

## Features

- Receive payments in Bitcoin or local currency
- Customize the payment currency for receiving funds

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **State Management**: React hooks

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Copy environment variables**

  ```bash
  cp env.sample .env
  ```

3. **Run the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser**:

   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Connect to the Mavapay API

This client is tighly coupled to the Mavapay API. You'll need to run the Mavapay backend to create a payment link that can be previewed using this UI.

### Dynamic Routes

Access specific payment pages using the format:

```bash
/checkout/[payment-id]
```

Example: `/checkout/f8ed7c26-98a8-48a5-b74c-a3b437f09c51`

### API Integration

The application is designed to work with your payment API that returns data in the following format:

```json
{
    "status": "ok",
    "message": "payment link details",
    "data": {
        "paymentLinkDetails": {
            "id": "f8ed7c26-98a8-48a5-b74c-a3b437f09c51",
            "name": "First test",
            "description": "Testing the payment link",
            "callbackUrl": "https://mavapay.co/login",
            "settlementCurrency": "BTC",
            "paymentLinkOrderId": "e7bc7653-210a-4bd0-b428-e37406eca714",
            "paymentMethods": [
                "BANKTRANSFER",
                "LIGHTNING"
            ],
            "account": {
                "name": "Extheo Agric",
                "logo": ""
            },
            "BANKTRANSFER": {
                "ngnAccountName": "Mava Digital Solutions Limited",
                "ngnBankName": "GLOBUS BANK",
                "ngnBankAccountNumber": "3242473433",
                "amount": 884443,
                "expiresAt": "2025-08-21T16:59:07.848Z",
                "targetAmount": 5000
            }
        }
    }
}
```

To integrate with your real API:

1. Set the `NEXT_PUBLIC_API_URL` environment variable
2. The app automatically transforms the API response to the internal data structure required by the client

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# API Configuration
NEXT_PUBLIC_MAVAPAY_API_BASE_URL=http://localhost:8080/api/v1

# For production, use your actual API URL:
# NEXT_PUBLIC_MAVAPAY_API_BASE_URL=https://api.mavapay.co/api/v1
```

## Client API Integration

The application integrates with real API endpoints:

### Payment Details Endpoint

```curl
GET /api/v1/paymentlink/details?id={paymentId}&paymentMethod={method}
```

**Parameters:**

- `id` (required): Payment link ID
- `paymentMethod` (optional): `LIGHTNING` or `BANKTRANSFER`

**Response Structure:**

```json
{
  "status": "ok",
  "message": "payment link details",
  "data": {
    "paymentLinkDetails": {
      "id": "string",
      "name": "string",
      "description": "string",
      "callbackUrl": "string",
      "paymentLinkOrderId": "string",
      "paymentMethods": ["BANKTRANSFER", "LIGHTNING"],
      "account": {
        "name": "string",
        "logo": "string"
      },
      "LIGHTNING": {
        "invoice": "string",
        "amount": number,
        "expiresAt": "ISO date string"
      },
      "BANKTRANSFER": {
        "ngnAccountName": "string",
        "ngnBankName": "string", 
        "ngnBankAccountNumber": "string",
        "amount": number,
        "expiresAt": "ISO date string"
      }
    }
  }
}
```

### Logo Support

The application supports base64 encoded logos or cdn host images from your API response. If no logo is provided, it falls back to displaying the merchant name as text.

## Deployment

This application can be deployed on any platform that supports Next.js:

## License

MIT License - feel free to use this project as a starting point for your own payment checkout implementation.
