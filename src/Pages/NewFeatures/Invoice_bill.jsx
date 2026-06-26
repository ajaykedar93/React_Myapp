import React, { useEffect, useMemo, useState } from "react";

/*
  Invoice_bill.jsx

  APIs used:
  GET  /api/invoices/next-no
  POST /api/invoices
  GET  /api/invoices/:id/pdf
  GET  /api/invoices/:id/pdf-view
  POST /api/invoices/pdf-preview

  Logic:
  Supplier State Code === Buyer State Code  => CGST + SGST
  Supplier State Code !== Buyer State Code  => IGST
*/

const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

const defaultForm = {
  invoice_no: "",
  invoice_date: new Date().toISOString().slice(0, 10),
  igst_rate: 5,

  supplier_name: "ARVIND NAVNATH SHELKE",
  supplier_address:
    "1 Adgaon Kh, Pimpli Lokai Shirdi, Tal:- Rahata Dist :- Ahmednagar",
  supplier_gstin: "27KNNVPS8477J1ZE",
  supplier_state_name: "Maharashtra",
  supplier_state_code: "27",

  consignee_name: "BABA ENTERPRISES",
  consignee_state_name: "Maharashtra",
  consignee_state_code: "27",

  buyer_name: "BABA ENTERPRISES",
  buyer_gstin: "27AATFB5667K1ZO",
  buyer_state_name: "Maharashtra",
  buyer_state_code: "27",
  buyer_address: "324/12 NAGAR MANMAD ROAD RAHATA",

  bank_name: "STATE BANK OF INDIA",
  bank_account_no: "41116710845",
  bank_branch: "LONI BK",
  bank_ifsc: "SBIN0006322",
};

const defaultItems = [
  {
    description: "Supply Material Wash Sand",
    hsn_sac: "251710",
    gst_rate: 5,
    quantity: 2,
    rate: 5000,
    per: "Brass",
  },
];

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function cleanStateCode(value) {
  return String(value || "").trim();
}

function getSameState(form) {
  const supplierCode = cleanStateCode(form.supplier_state_code);
  const buyerCode = cleanStateCode(form.buyer_state_code || form.consignee_state_code);

  return Boolean(supplierCode && buyerCode && supplierCode === buyerCode);
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

function openPdfBlob(blob) {
  const url = window.URL.createObjectURL(blob);
  const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!openedWindow) {
    downloadBlob(blob, "invoice-preview.pdf");
    return;
  }

  setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}

export default function InvoiceBill() {
  const [form, setForm] = useState(defaultForm);
  const [items, setItems] = useState(defaultItems);
  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);
  const [loadingNextNo, setLoadingNextNo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [toast, setToast] = useState("");

  const totals = useMemo(() => {
    const taxableAmount = items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.rate || 0);
    }, 0);

    const gstRate = Number(form.igst_rate || 0);
    const totalTaxAmount = taxableAmount * (gstRate / 100);
    const sameState = getSameState(form);

    const cgstRate = sameState ? gstRate / 2 : 0;
    const sgstRate = sameState ? gstRate / 2 : 0;
    const igstRate = sameState ? 0 : gstRate;

    const cgstAmount = sameState ? totalTaxAmount / 2 : 0;
    const sgstAmount = sameState ? totalTaxAmount / 2 : 0;
    const igstAmount = sameState ? 0 : totalTaxAmount;

    const grandTotalBeforeRound = taxableAmount + totalTaxAmount;
    const grandTotal = Math.round(grandTotalBeforeRound);
    const roundUp = grandTotal - grandTotalBeforeRound;

    return {
      sameState,
      taxableAmount,
      gstRate,
      totalTaxAmount,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      roundUp,
      grandTotal,
    };
  }, [items, form]);

  useEffect(() => {
    fetchNextInvoiceNo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  async function fetchNextInvoiceNo(dateValue = form.invoice_date) {
    try {
      setLoadingNextNo(true);

      const response = await fetch(
        `${API_BASE_URL}/invoices/next-no?date=${encodeURIComponent(dateValue)}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not fetch next invoice number");
      }

      setForm((prev) => ({
        ...prev,
        invoice_no: data.nextInvoiceNo || "",
      }));

      setSavedInvoice(null);
    } catch (error) {
      showToast(error.message || "Failed to load invoice number");
    } finally {
      setLoadingNextNo(false);
    }
  }

  function updateField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "buyer_state_name") {
        next.consignee_state_name = value;
      }

      if (name === "buyer_state_code") {
        next.consignee_state_code = value;
      }

      if (name === "buyer_name") {
        next.consignee_name = value;
      }

      return next;
    });

    setSavedInvoice(null);

    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function updateItem(index, name, value) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [name]: value };
      return next;
    });

    setSavedInvoice(null);

    setItemErrors((prev) => {
      const next = [...prev];

      if (next[index]) {
        delete next[index][name];
      }

      return next;
    });
  }

  function updateGstRate(name, value) {
    updateField(name, value);

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        gst_rate: value,
      }))
    );
  }

  function addItem() {
    if (items.length >= 8) {
      showToast("Maximum 8 material rows allowed for one-page A4 PDF");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        description: "",
        hsn_sac: "251710",
        gst_rate: Number(form.igst_rate || 5),
        quantity: "",
        rate: "",
        per: "Brass",
      },
    ]);

    setSavedInvoice(null);
  }

  function removeItem(index) {
    if (items.length === 1) {
      showToast("At least one material row is required");
      return;
    }

    setItems((prev) => prev.filter((_, i) => i !== index));
    setSavedInvoice(null);
  }

  function validate() {
    const nextErrors = {};
    const nextItemErrors = [];

    const requiredFields = [
      "invoice_no",
      "invoice_date",
      "supplier_name",
      "supplier_address",
      "supplier_gstin",
      "supplier_state_name",
      "supplier_state_code",
      "consignee_name",
      "buyer_name",
      "buyer_gstin",
      "buyer_address",
      "buyer_state_name",
      "buyer_state_code",
      "bank_name",
      "bank_account_no",
      "bank_branch",
      "bank_ifsc",
    ];

    requiredFields.forEach((field) => {
      if (!String(form[field] || "").trim()) {
        nextErrors[field] = "Required";
      }
    });

    if (Number(form.igst_rate) < 0 || Number.isNaN(Number(form.igst_rate))) {
      nextErrors.igst_rate = "Enter valid GST rate";
    }

    items.forEach((item, index) => {
      const err = {};

      if (!String(item.description || "").trim()) {
        err.description = "Required";
      }

      if (!String(item.hsn_sac || "").trim()) {
        err.hsn_sac = "Required";
      }

      if (!String(item.per || "").trim()) {
        err.per = "Required";
      }

      if (Number(item.quantity) <= 0 || Number.isNaN(Number(item.quantity))) {
        err.quantity = "Qty must be greater than 0";
      }

      if (Number(item.rate) <= 0 || Number.isNaN(Number(item.rate))) {
        err.rate = "Rate must be greater than 0";
      }

      if (Number(item.gst_rate) < 0 || Number.isNaN(Number(item.gst_rate))) {
        err.gst_rate = "Invalid";
      }

      nextItemErrors[index] = err;
    });

    setErrors(nextErrors);
    setItemErrors(nextItemErrors);

    const hasFormError = Object.keys(nextErrors).length > 0;
    const hasItemError = nextItemErrors.some((x) => Object.keys(x).length > 0);

    if (hasFormError || hasItemError) {
      showToast("Please fill all required details correctly");
      return false;
    }

    return true;
  }

  function buildPayload() {
    const gstRate = Number(form.igst_rate || 0);

    return {
      ...form,

      // Keep both names for backend compatibility.
      gst_rate: gstRate,
      igst_rate: gstRate,

      tax_type: totals.sameState ? "CGST_SGST" : "IGST",
      same_state: totals.sameState,

      taxable_amount: totals.taxableAmount,
      cgst_rate: totals.cgstRate,
      sgst_rate: totals.sgstRate,
      igst_rate_actual: totals.igstRate,
      cgst_amount: totals.cgstAmount,
      sgst_amount: totals.sgstAmount,
      igst_amount: totals.igstAmount,
      total_tax_amount: totals.totalTaxAmount,
      round_up: totals.roundUp,
      grand_total: totals.grandTotal,

      items: items.map((item, index) => ({
        sr_no: index + 1,
        description: String(item.description || "").trim(),
        hsn_sac: item.hsn_sac || "251710",
        gst_rate: Number(item.gst_rate || form.igst_rate || 5),
        quantity: Number(item.quantity || 0),
        rate: Number(item.rate || 0),
        per: item.per || "Brass",
      })),
    };
  }

  async function saveInvoice() {
    if (savedInvoice?.id) {
      showToast("Invoice already saved. You can download PDF now.");
      return savedInvoice;
    }

    if (!validate()) return null;

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save invoice");
      }

      setSavedInvoice(data.invoice);
      showToast("Invoice saved successfully");
      return data.invoice;
    } catch (error) {
      showToast(error.message || "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function previewPdf() {
    if (!validate()) return;

    try {
      setPreviewLoading(true);

      const response = await fetch(`${API_BASE_URL}/invoices/pdf-preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });

      if (!response.ok) {
        throw new Error("Failed to generate preview PDF");
      }

      const blob = await response.blob();
      openPdfBlob(blob);
      showToast("Preview PDF generated");
    } catch (error) {
      showToast(error.message || "PDF preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveAndDownloadPdf() {
    const invoice = await saveInvoice();

    if (!invoice?.id) return;

    await downloadPdfById(invoice);
  }

  async function downloadSavedPdf() {
    if (!savedInvoice?.id) {
      showToast("Please save invoice first, then download PDF.");
      return;
    }

    await downloadPdfById(savedInvoice);
  }

  async function downloadPdfById(invoice) {
    try {
      setPdfLoading(true);

      const response = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/pdf`);

      if (!response.ok) {
        throw new Error("Failed to download invoice PDF");
      }

      const blob = await response.blob();
      const fileName = `invoice-${invoice.invoice_no || invoice.id}.pdf`.replaceAll(
        "/",
        "-"
      );

      downloadBlob(blob, fileName);
      showToast("PDF downloaded successfully");
    } catch (error) {
      showToast(error.message || "PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  }

  function resetForm() {
    const today = new Date().toISOString().slice(0, 10);

    setForm({
      ...defaultForm,
      invoice_date: today,
    });

    setItems(defaultItems);
    setErrors({});
    setItemErrors([]);
    setSavedInvoice(null);

    setTimeout(() => fetchNextInvoiceNo(today), 0);
  }

  return (
    <div className="invoice-page">
      <style>{styles}</style>

      {toast && <div className="toast">{toast}</div>}

      <header className="topbar">
        <div className="topbar-copy">
          <p className="eyebrow">GST TAX INVOICE</p>
          <h1>Invoice Bill Dashboard</h1>
          <p className="subtitle">
            Fill bill details. PDF format will be generated exactly from backend invoice format.
          </p>
        </div>

        <div className="top-actions">
          <button
            type="button"
            className="btn btn-light"
            onClick={() => fetchNextInvoiceNo()}
            disabled={loadingNextNo || saving || pdfLoading || previewLoading}
          >
            {loadingNextNo ? "Loading..." : "Auto Invoice No"}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={resetForm}
            disabled={saving || pdfLoading || previewLoading}
          >
            Reset
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="panel form-panel">
          <div className="section-title">
            <div>
              <h2>Invoice Details</h2>
              <p>Same state will print CGST + SGST. Other state will print IGST.</p>
            </div>

            {savedInvoice?.id && (
              <span className="saved-badge">Saved ID #{savedInvoice.id}</span>
            )}
          </div>

          <div className="form-grid three">
            <Input
              label="Invoice No"
              name="invoice_no"
              value={form.invoice_no}
              onChange={updateField}
              error={errors.invoice_no}
              placeholder="10/2026-27"
              required
            />

            <Input
              label="Invoice Date"
              name="invoice_date"
              type="date"
              value={form.invoice_date}
              onChange={updateField}
              onBlur={() => fetchNextInvoiceNo(form.invoice_date)}
              error={errors.invoice_date}
              required
            />

            <Input
              label="GST Rate %"
              name="igst_rate"
              type="number"
              value={form.igst_rate}
              onChange={updateGstRate}
              error={errors.igst_rate}
              required
            />
          </div>

          <div className={`tax-status ${totals.sameState ? "same" : "other"}`}>
            <b>Tax Type:</b>{" "}
            {totals.sameState
              ? `Same State — CGST ${money(totals.cgstRate).replace(".00", "")}% + SGST ${money(totals.sgstRate).replace(".00", "")}%`
              : `Other State — IGST ${money(totals.igstRate).replace(".00", "")}%`}
          </div>

          <div className="divider" />

          <div className="section-title compact">
            <h2>Supplier Details</h2>
          </div>

          <div className="form-grid two">
            <Input
              label="Supplier Name"
              name="supplier_name"
              value={form.supplier_name}
              onChange={updateField}
              error={errors.supplier_name}
              required
            />

            <Input
              label="Supplier GSTIN"
              name="supplier_gstin"
              value={form.supplier_gstin}
              onChange={updateField}
              error={errors.supplier_gstin}
              required
            />

            <Textarea
              label="Supplier Address"
              name="supplier_address"
              value={form.supplier_address}
              onChange={updateField}
              error={errors.supplier_address}
              required
            />

            <div className="form-grid two inner">
              <Input
                label="State Name"
                name="supplier_state_name"
                value={form.supplier_state_name}
                onChange={updateField}
                error={errors.supplier_state_name}
                required
              />

              <Input
                label="State Code"
                name="supplier_state_code"
                value={form.supplier_state_code}
                onChange={updateField}
                error={errors.supplier_state_code}
                required
              />
            </div>
          </div>

          <div className="divider" />

          <div className="section-title compact">
            <h2>Consignee Details</h2>
          </div>

          <div className="form-grid three">
            <Input
              label="Consignee Name"
              name="consignee_name"
              value={form.consignee_name}
              onChange={updateField}
              error={errors.consignee_name}
              required
            />

            <Input
              label="Consignee State"
              name="consignee_state_name"
              value={form.consignee_state_name}
              onChange={updateField}
            />

            <Input
              label="Consignee State Code"
              name="consignee_state_code"
              value={form.consignee_state_code}
              onChange={updateField}
            />
          </div>

          <div className="divider" />

          <div className="section-title compact">
            <h2>Buyer Details</h2>
          </div>

          <div className="form-grid two">
            <Input
              label="Buyer Name"
              name="buyer_name"
              value={form.buyer_name}
              onChange={updateField}
              error={errors.buyer_name}
              required
            />

            <Input
              label="Buyer GSTIN"
              name="buyer_gstin"
              value={form.buyer_gstin}
              onChange={updateField}
              error={errors.buyer_gstin}
              required
            />

            <Textarea
              label="Buyer Address"
              name="buyer_address"
              value={form.buyer_address}
              onChange={updateField}
              error={errors.buyer_address}
              required
            />

            <div className="form-grid two inner">
              <Input
                label="Buyer State"
                name="buyer_state_name"
                value={form.buyer_state_name}
                onChange={updateField}
                error={errors.buyer_state_name}
                required
              />

              <Input
                label="Buyer State Code"
                name="buyer_state_code"
                value={form.buyer_state_code}
                onChange={updateField}
                error={errors.buyer_state_code}
                required
              />
            </div>
          </div>

          <div className="divider" />

          <div className="section-title compact">
            <h2>Bank Details</h2>
          </div>

          <div className="form-grid four">
            <Input
              label="Bank Name"
              name="bank_name"
              value={form.bank_name}
              onChange={updateField}
              error={errors.bank_name}
              required
            />

            <Input
              label="A/c No"
              name="bank_account_no"
              value={form.bank_account_no}
              onChange={updateField}
              error={errors.bank_account_no}
              required
            />

            <Input
              label="Branch"
              name="bank_branch"
              value={form.bank_branch}
              onChange={updateField}
              error={errors.bank_branch}
              required
            />

            <Input
              label="IFSC Code"
              name="bank_ifsc"
              value={form.bank_ifsc}
              onChange={updateField}
              error={errors.bank_ifsc}
              required
            />
          </div>
        </section>

        <aside className="panel summary-panel">
          <h2>Live Bill Summary</h2>

          <div className="summary-card">
            <span>Taxable Amount</span>
            <strong>₹ {money(totals.taxableAmount)}</strong>
          </div>

          {totals.sameState ? (
            <>
              <div className="summary-card">
                <span>CGST @ {money(totals.cgstRate).replace(".00", "")}%</span>
                <strong>₹ {money(totals.cgstAmount)}</strong>
              </div>

              <div className="summary-card">
                <span>SGST @ {money(totals.sgstRate).replace(".00", "")}%</span>
                <strong>₹ {money(totals.sgstAmount)}</strong>
              </div>
            </>
          ) : (
            <div className="summary-card">
              <span>IGST @ {money(totals.igstRate).replace(".00", "")}%</span>
              <strong>₹ {money(totals.igstAmount)}</strong>
            </div>
          )}

          <div className="summary-card">
            <span>Total GST</span>
            <strong>₹ {money(totals.totalTaxAmount)}</strong>
          </div>

          <div className="summary-card">
            <span>Round Up</span>
            <strong>₹ {money(totals.roundUp)}</strong>
          </div>

          <div className="summary-total">
            <span>Grand Total</span>
            <strong>₹ {money(totals.grandTotal)}</strong>
          </div>

          <div className="quick-info">
            <p>
              <b>Status:</b>{" "}
              {savedInvoice?.id
                ? `Saved successfully as invoice ID #${savedInvoice.id}.`
                : "Invoice not saved yet."}
            </p>
            <p>
              <b>PDF:</b> Preview without save, or save and download final bill.
            </p>
          </div>

          <div className="summary-actions">
            <button
              type="button"
              className="btn btn-outline full"
              onClick={previewPdf}
              disabled={saving || pdfLoading || previewLoading}
            >
              {previewLoading ? "Generating..." : "Preview PDF"}
            </button>

            <button
              type="button"
              className="btn btn-primary full"
              onClick={saveInvoice}
              disabled={saving || pdfLoading || previewLoading || savedInvoice?.id}
            >
              {saving ? "Saving..." : savedInvoice?.id ? "Invoice Saved" : "Save Invoice"}
            </button>

            <button
              type="button"
              className="btn btn-dark full"
              onClick={downloadSavedPdf}
              disabled={saving || pdfLoading || previewLoading || !savedInvoice?.id}
            >
              {pdfLoading ? "Downloading..." : "Download Saved PDF"}
            </button>

            <button
              type="button"
              className="btn btn-success full"
              onClick={saveAndDownloadPdf}
              disabled={saving || pdfLoading || previewLoading}
            >
              {saving || pdfLoading ? "Please wait..." : "Save & Download PDF"}
            </button>
          </div>
        </aside>
      </main>

      <section className="panel material-panel">
        <div className="section-title">
          <div>
            <h2>Material Details</h2>
            <p>Add material rows exactly like invoice bill table.</p>
          </div>

          <button type="button" className="btn btn-primary" onClick={addItem}>
            + Add Material
          </button>
        </div>

        <div className="table-wrap">
          <table className="items-table">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Description of Goods</th>
                <th>HSN/SAC</th>
                <th>GST %</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Per</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => {
                const amount = Number(item.quantity || 0) * Number(item.rate || 0);

                return (
                  <tr key={index}>
                    <td className="sr">{index + 1}</td>

                    <td>
                      <TableInput
                        value={item.description}
                        onChange={(value) => updateItem(index, "description", value)}
                        error={itemErrors[index]?.description}
                        placeholder="Supply Material Wash Sand"
                      />
                    </td>

                    <td>
                      <TableInput
                        value={item.hsn_sac}
                        onChange={(value) => updateItem(index, "hsn_sac", value)}
                        error={itemErrors[index]?.hsn_sac}
                      />
                    </td>

                    <td>
                      <TableInput
                        type="number"
                        value={item.gst_rate}
                        onChange={(value) => updateItem(index, "gst_rate", value)}
                        error={itemErrors[index]?.gst_rate}
                      />
                    </td>

                    <td>
                      <TableInput
                        type="number"
                        value={item.quantity}
                        onChange={(value) => updateItem(index, "quantity", value)}
                        error={itemErrors[index]?.quantity}
                      />
                    </td>

                    <td>
                      <TableInput
                        type="number"
                        value={item.rate}
                        onChange={(value) => updateItem(index, "rate", value)}
                        error={itemErrors[index]?.rate}
                      />
                    </td>

                    <td>
                      <TableInput
                        value={item.per}
                        onChange={(value) => updateItem(index, "per", value)}
                        error={itemErrors[index]?.per}
                      />
                    </td>

                    <td className="amount">₹ {money(amount)}</td>

                    <td>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => removeItem(index)}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan="7">Total Taxable Amount</td>
                <td colSpan="2">₹ {money(totals.taxableAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  required,
  onBlur,
}) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>
        {label} {required && <em>*</em>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={onBlur}
      />
      {error && <small>{error}</small>}
    </label>
  );
}

function Textarea({ label, name, value, onChange, error, required }) {
  return (
    <label className={`field textarea-field ${error ? "has-error" : ""}`}>
      <span>
        {label} {required && <em>*</em>}
      </span>
      <textarea
        value={value}
        rows="4"
        onChange={(e) => onChange(name, e.target.value)}
      />
      {error && <small>{error}</small>}
    </label>
  );
}

function TableInput({ value, onChange, error, type = "text", placeholder }) {
  return (
    <div className={`table-input ${error ? "has-error" : ""}`}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <small>{error}</small>}
    </div>
  );
}

const styles = `
.invoice-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.13), transparent 28rem),
    linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  color: #111827;
  padding: 24px;
  padding-top: max(24px, env(safe-area-inset-top));
  padding-bottom: max(28px, env(safe-area-inset-bottom));
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

.topbar {
  max-width: 1480px;
  margin: 0 auto 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 18px 55px rgba(15, 23, 42, 0.08);
  border-radius: 26px;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.topbar-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 7px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: clamp(24px, 3vw, 36px);
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.subtitle {
  margin-top: 7px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.top-actions,
.summary-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.dashboard-grid {
  max-width: 1480px;
  margin: 0 auto 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.panel {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 18px 55px rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  padding: 22px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-title.compact {
  margin-bottom: 13px;
}

.section-title h2,
.summary-panel h2 {
  font-size: 19px;
  letter-spacing: -0.02em;
}

.section-title p {
  margin-top: 5px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.tax-status {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid;
}

.tax-status.same {
  background: #ecfdf5;
  border-color: #bbf7d0;
  color: #166534;
}

.tax-status.other {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #9a3412;
}

.form-grid {
  display: grid;
  gap: 14px;
}

.form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-grid.four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.form-grid.inner {
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.field span {
  color: #334155;
  font-size: 12.5px;
  font-weight: 900;
}

.field em {
  color: #ef4444;
  font-style: normal;
}

.field input,
.field textarea,
.table-input input {
  width: 100%;
  border: 1px solid #dbe3ef;
  outline: none;
  background: #f8fafc;
  color: #111827;
  border-radius: 14px;
  padding: 11px 12px;
  font-size: 14px;
  transition: 0.18s ease;
}

.field textarea {
  resize: vertical;
  min-height: 90px;
}

.field input:focus,
.field textarea:focus,
.table-input input:focus {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.11);
}

.field small,
.table-input small {
  color: #dc2626;
  font-size: 11px;
  font-weight: 800;
}

.has-error input,
.has-error textarea {
  border-color: #ef4444 !important;
  background: #fff7f7 !important;
}

.divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #dbe3ef, transparent);
  margin: 22px 0;
}

.btn {
  border: none;
  cursor: pointer;
  border-radius: 14px;
  padding: 11px 15px;
  font-size: 14px;
  font-weight: 900;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.btn-primary {
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22);
}

.btn-dark {
  color: #ffffff;
  background: linear-gradient(135deg, #111827, #334155);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
}

.btn-success {
  color: #ffffff;
  background: linear-gradient(135deg, #16a34a, #15803d);
  box-shadow: 0 10px 24px rgba(22, 163, 74, 0.22);
}

.btn-light {
  color: #1d4ed8;
  background: #dbeafe;
}

.btn-outline {
  color: #334155;
  background: #ffffff;
  border: 1px solid #cbd5e1;
}

.btn.full {
  width: 100%;
}

.summary-panel {
  position: sticky;
  top: 18px;
}

.summary-panel h2 {
  margin-bottom: 16px;
}

.summary-card,
.summary-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-radius: 17px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 10px;
}

.summary-card span,
.summary-total span {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.summary-card strong {
  font-size: 17px;
}

.summary-total {
  background: linear-gradient(135deg, #111827, #1e293b);
  color: #ffffff;
  margin-top: 14px;
}

.summary-total span {
  color: #dbeafe;
}

.summary-total strong {
  font-size: 22px;
}

.quick-info {
  margin: 18px 0;
  padding: 14px;
  border-radius: 17px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.quick-info p {
  color: #334155;
  font-size: 12.5px;
  line-height: 1.55;
}

.quick-info p + p {
  margin-top: 8px;
}

.summary-actions {
  flex-direction: column;
}

.saved-badge {
  background: #dcfce7;
  color: #166534;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.material-panel {
  max-width: 1480px;
  margin: 0 auto;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
}

.items-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
}

.items-table th {
  background: #111827;
  color: #ffffff;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 13px 11px;
  text-align: left;
  white-space: nowrap;
}

.items-table td {
  border-top: 1px solid #e2e8f0;
  padding: 10px;
  background: #ffffff;
  vertical-align: top;
}

.items-table tbody tr:hover td {
  background: #f8fafc;
}

.items-table tfoot td {
  background: #eff6ff;
  color: #1e3a8a;
  font-weight: 900;
  font-size: 15px;
}

.items-table tfoot td:last-child {
  text-align: right;
}

.sr {
  width: 50px;
  color: #64748b;
  font-weight: 900;
  text-align: center;
}

.amount {
  min-width: 130px;
  text-align: right;
  font-weight: 900;
  color: #111827;
  white-space: nowrap;
}

.table-input input {
  border-radius: 12px;
  padding: 10px 11px;
  min-width: 90px;
}

.icon-btn {
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  font-size: 22px;
  font-weight: 900;
}

.icon-btn.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.toast {
  position: fixed;
  top: max(18px, env(safe-area-inset-top));
  right: 18px;
  z-index: 9999;
  background: #111827;
  color: #ffffff;
  padding: 13px 17px;
  border-radius: 16px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.24);
  font-weight: 900;
  max-width: min(360px, calc(100vw - 32px));
}

@media (max-width: 1180px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .summary-panel {
    position: static;
  }

  .form-grid.four,
  .form-grid.three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .invoice-page {
    padding: 12px;
    padding-top: max(12px, env(safe-area-inset-top));
    padding-bottom: max(90px, env(safe-area-inset-bottom));
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
    border-radius: 20px;
    padding: 14px;
    gap: 12px;
    margin-bottom: 12px;
  }

  .topbar h1 {
    font-size: 21px;
  }

  .subtitle {
    font-size: 12.5px;
  }

  .top-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .top-actions .btn {
    width: 100%;
    min-height: 38px;
    font-size: 12.5px;
    padding: 9px 10px;
    border-radius: 12px;
  }

  .dashboard-grid {
    gap: 12px;
    margin-bottom: 12px;
  }

  .panel {
    padding: 14px;
    border-radius: 20px;
  }

  .section-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 13px;
  }

  .section-title h2,
  .summary-panel h2 {
    font-size: 17px;
  }

  .section-title p {
    font-size: 12px;
  }

  .form-grid.two,
  .form-grid.three,
  .form-grid.four {
    grid-template-columns: 1fr;
  }

  .form-grid {
    gap: 11px;
  }

  .field span {
    font-size: 12px;
  }

  .field input,
  .field textarea,
  .table-input input {
    font-size: 13px;
    padding: 10px 11px;
    border-radius: 12px;
  }

  .divider {
    margin: 18px 0;
  }

  .summary-card,
  .summary-total {
    padding: 11px;
    border-radius: 14px;
  }

  .summary-card span,
  .summary-total span {
    font-size: 12px;
  }

  .summary-card strong {
    font-size: 15px;
  }

  .summary-total strong {
    font-size: 18px;
  }

  .quick-info {
    margin: 14px 0;
    padding: 12px;
    border-radius: 14px;
  }

  .quick-info p {
    font-size: 12px;
  }

  .summary-actions {
    gap: 8px;
  }

  .summary-actions .btn {
    min-height: 40px;
    font-size: 13px;
  }

  .saved-badge {
    font-size: 11.5px;
    padding: 7px 10px;
  }

  .material-panel {
    margin-bottom: 30px;
  }

  .items-table {
    min-width: 980px;
  }

  .items-table th {
    font-size: 11px;
    padding: 11px 9px;
  }

  .items-table td {
    padding: 8px;
  }

  .toast {
    top: max(12px, env(safe-area-inset-top));
    right: 12px;
    left: 12px;
    max-width: none;
    text-align: center;
    font-size: 13px;
    padding: 12px 14px;
  }
}

@media (max-width: 380px) {
  .top-actions {
    grid-template-columns: 1fr;
  }

  .top-actions .btn {
    width: 100%;
  }
}
`;
