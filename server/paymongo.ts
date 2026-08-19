export interface CreateCheckoutInput {
  secretKey: string;
  successUrl: string;
  cancelUrl: string;
  companyId: string;
  userId: string;
  planId: string;
  customerEmail?: string;
  customerName?: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  checkoutSessionId: string;
}

export async function createPayMongoCheckoutSession(
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const encodedKey = Buffer.from(`${input.secretKey}:`).toString('base64');
  const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedKey}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          payment_method_types: ['gcash', 'paymaya', 'card', 'qrph'],
          line_items: [
            {
              currency: 'PHP',
              amount: 49900,
              name: 'CasinFreight Founding (Monthly)',
              quantity: 1,
              description: 'Unlimited trucks, team seats, roles, and trip transactions.',
            },
          ],
          description: `CasinFreight Founding for ${input.customerEmail || input.userId}`,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            user_id: input.userId,
            company_id: input.companyId,
            plan_id: input.planId,
          },
        },
      },
    }),
  });

  const payload = await response.json() as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
    errors?: Array<{ detail?: string }>;
  };

  if (!response.ok) {
    const detail = payload.errors?.[0]?.detail || 'PayMongo checkout failed.';
    throw new Error(detail);
  }

  const checkoutUrl = payload.data?.attributes?.checkout_url;
  const checkoutSessionId = payload.data?.id;
  if (!checkoutUrl || !checkoutSessionId) {
    throw new Error('PayMongo did not return a checkout URL.');
  }

  return { checkoutUrl, checkoutSessionId };
}
