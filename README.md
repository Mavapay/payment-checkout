# Payment Checkout Application

A modern payment checkout page built with Next.js, TypeScript, and shadcn/ui components. This application replicates a professional payment interface similar to modern payment processors.

## Features

- 🎨 **Modern UI**: Clean, responsive design using shadcn/ui components
- ⏱️ **Real-time Countdown**: Live payment expiration timer
- 💳 **Multiple Payment Methods**: Support for bank transfer and lightning invoice (extensible)
- 📋 **Copy to Clipboard**: Easy copying of payment details
- 🔄 **Dynamic Loading**: Fetches payment data from API based on payment ID
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔧 **Modular Components**: Clean, reusable component architecture

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **State Management**: React hooks

## Project Structure

```
src/
├── app/
│   ├── checkout/[id]/     # Dynamic checkout routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── BankTransferDetails.tsx
│   ├── CheckoutPage.tsx
│   ├── PaymentActions.tsx
│   ├── PaymentFooter.tsx
│   ├── PaymentHeader.tsx
│   └── PaymentMethods.tsx
├── services/
│   └── api.ts            # API service layer
└── types/
    └── payment.ts        # TypeScript interfaces
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Demo
Visit the home page and click "View Demo Checkout Page" to see the payment interface in action.

### Dynamic Routes
Access specific payment pages using the format:
```
/checkout/[payment-id]
```

Example: `/checkout/payment_123456`

### API Integration
The application is designed to work with your payment API that returns data in the following format:

```json
{
    "status": "ok",
    "data": {
        "id": "808a172a-082d-45f5-b410-14d93c58245e",
        "exchangeRate": 2063641.875,
        "usdToTargetCurrencyRate": 17.5708238,
        "sourceToTargetCurrencyRate": 87.84,
        "sourceCurrency": "NGNKOBO",
        "targetCurrency": "ZARCENT",
        "transactionFeesInSourceCurrency": 224931,
        "transactionFeesInTargetCurrency": 2516,
        "amountInSourceCurrency": 500000,
        "amountInTargetCurrency": 500733,
        "paymentMethod": "BANKTRANSFER",
        "expiry": "2025-08-14T20:19:14.843Z",
        "isValid": true,
        "invoice": "",
        "hash": "689e426b86037b0012075e28",
        "totalAmountInSourceCurrency": 500000,
        "customerInternalFee": 0,
        "bankName": "GLOBUS BANK",
        "ngnBankAccountNumber": "3242335025",
        "ngnAccountName": "Mava Digital Solutions Limited",
        "orderId": "17491-4010"
    }
}
```

To integrate with your real API:

1. Set the `NEXT_PUBLIC_API_URL` environment variable
2. Uncomment the real API implementation in `src/services/api.ts`
3. The app automatically transforms the API response to the internal data structure
4. Add authentication headers if required by your API

## Components

### PaymentHeader
- Displays merchant logo and name
- Shows payment expiration countdown
- Responsive header layout

### PaymentMethods
- Lists available payment methods
- Handles method selection
- Extensible for new payment types

### BankTransferDetails
- Shows bank account information
- Copy-to-clipboard functionality
- Transaction expiry warnings

### PaymentActions
- Cancel and confirm payment buttons
- Handles payment confirmation flow
- Loading states and error handling

## Customization

### Adding New Payment Methods
1. Update the `PaymentMethod` interface in `src/types/payment.ts`
2. Add the method to your API response
3. Create a new detail component (similar to `BankTransferDetails`)
4. Update the `CheckoutPage` component to handle the new method

### Styling
The application uses Tailwind CSS with shadcn/ui components. Customize:
- Colors in `src/app/globals.css`
- Component styles in individual component files
- shadcn/ui theme configuration

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# API Configuration
NEXT_PUBLIC_MAVAPAY_API_BASE_URL=http://localhost:8080/api/v1

# For production, use your actual API URL:
# NEXT_PUBLIC_MAVAPAY_API_BASE_URL=https://your-api-domain.com/api/v1
```

## API Integration

The application integrates with real API endpoints:

### Payment Details Endpoint
```
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
The application supports base64 encoded logos from your API response. If no logo is provided, it falls back to displaying the merchant name as text.

## Deployment

This application can be deployed on any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Docker containers**

## License

MIT License - feel free to use this project as a starting point for your own payment checkout implementation.
