import type { CustomerInvoice, StorefrontSettings } from "../types/customer.types";

const currency = (value: number) => `$${value.toFixed(2)}`;

export const printInvoiceReceipt = (invoice: CustomerInvoice, store: Pick<StorefrontSettings, "store_name" | "support_email" | "support_phone">) => {
  const receiptWindow = window.open("", "_blank", "width=900,height=700");
  if (!receiptWindow) {
    throw new Error("Unable to open print window.");
  }

  const rows = invoice.items.map((item) => `
    <tr>
      <td>${item.title}<div style="color:#64748b;font-size:12px;">by ${item.author_name}</div></td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">${currency(item.price)}</td>
      <td style="text-align:right;">${currency(item.total)}</td>
    </tr>
  `).join("");

  receiptWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${invoice.id} Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; }
          .sheet { max-width: 820px; margin: 0 auto; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; }
          .muted { color:#64748b; }
          .pill { display:inline-block; padding:6px 12px; border-radius:999px; background:#f1f5f9; font-size:12px; font-weight:700; text-transform:uppercase; }
          table { width:100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 12px 0; font-size: 14px; vertical-align: top; }
          th { color:#64748b; text-transform:uppercase; font-size:12px; text-align:left; }
          .summary { margin-top: 24px; margin-left:auto; max-width: 320px; }
          .summary-row { display:flex; justify-content:space-between; padding:6px 0; }
          .summary-total { border-top:1px solid #cbd5e1; margin-top:8px; padding-top:12px; font-size:18px; font-weight:700; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div>
              <h1 style="margin:0 0 8px;font-size:28px;">${store.store_name}</h1>
              <div class="muted">${store.support_email}${store.support_phone ? ` • ${store.support_phone}` : ""}</div>
            </div>
            <div style="text-align:right;">
              <div class="pill">${invoice.status}</div>
              <h2 style="margin:16px 0 4px;font-size:24px;">Receipt ${invoice.id}</h2>
              <div class="muted">${new Date(invoice.createdAt).toLocaleString()}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px;">
            <div>
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#64748b;">Customer</div>
              <div style="margin-top:8px;font-weight:700;">${invoice.customerName}</div>
              <div class="muted">${invoice.customerEmail}</div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#64748b;">Shipping Address</div>
              <div style="margin-top:8px;">${invoice.shippingAddress}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Price</th>
                <th style="text-align:right;">Line Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="summary">
            <div class="summary-row"><span class="muted">Subtotal</span><span>${currency(invoice.subtotal)}</span></div>
            ${invoice.discountAmount > 0 ? `<div class="summary-row"><span class="muted">Discount${invoice.promoCode ? ` (${invoice.promoCode})` : ""}</span><span>-${currency(invoice.discountAmount)}</span></div>` : ""}
            <div class="summary-row"><span class="muted">Shipping</span><span>${currency(invoice.shipping)}</span></div>
            ${invoice.tax > 0 ? `<div class="summary-row"><span class="muted">Tax</span><span>${currency(invoice.tax)}</span></div>` : ""}
            <div class="summary-row summary-total"><span>Total</span><span>${currency(invoice.total)}</span></div>
          </div>
        </div>
      </body>
    </html>
  `);

  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.print();
};
