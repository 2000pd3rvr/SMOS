window.SmOS_CC_Payments = {
  businessName: "The Corner Cafe",
  payeeName: "The Corner Cafe",
  sortCode: "00-00-00",
  accountNumber: "00000000",
  bankName: "Business current account",
  referencePrefix: "CC",
  options: [
    {
      id: "bank-transfer",
      name: "Bank transfer",
      feeNote: "No platform or card fees — paid straight into the cafe account",
      summary:
        "Pay by Faster Payments from your bank app. Use the order reference so we can match your payment. Funds land in our business account with no third-party checkout cut.",
      availableFor: ["delivery", "collection", "sitting-in"],
    },
    {
      id: "cash-collection",
      name: "Cash on collection",
      feeNote: "No fees — pay at the counter",
      summary:
        "Pay cash when you collect at 9 Eskdail Court. The full amount stays with the cafe.",
      availableFor: ["collection"],
    },
    {
      id: "cash-sit-in",
      name: "Pay at your table",
      feeNote: "No fees — cash or cafe card terminal",
      summary:
        "Settle in the cafe when you sit in. Cash has no processing fees; any card terminal is the cafe’s own till (not a delivery-app commission).",
      availableFor: ["sitting-in"],
    },
  ],
};
