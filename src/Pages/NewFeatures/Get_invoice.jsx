import React, { useEffect, useMemo, useState } from "react";

/*
  Get_invoice.jsx
  --------------------------------------------------
  Responsive saved invoice dashboard page.

  APIs used:
  GET    https://express-backend-myapp.onrender.com/api/invoices
  GET    https://express-backend-myapp.onrender.com/api/invoices/:id
  GET    https://express-backend-myapp.onrender.com/api/invoices/:id/pdf
  PUT    https://express-backend-myapp.onrender.com/api/invoices/:id
  DELETE https://express-backend-myapp.onrender.com/api/invoices/:id
*/

const API_BASE_URL = "https://express-backend-myapp.onrender.com/api";

const emptyEditForm = {
  invoice_no: "",
  invoice_date: "",
  igst_rate: 5,

  supplier_name: "",
  supplier_address: "",
  supplier_gstin: "",
  supplier_state_name: "",
  supplier_state_code: "",

  consignee_name: "",
  consignee_state_name: "",
  consignee_state_code: "",

  buyer_name: "",
  buyer_gstin: "",
  buyer_state_name: "",
  buyer_state_code: "",
  buyer_address: "",

  bank_name: "",
  bank_account_no: "",
  bank_branch: "",
  bank_ifsc: "",
};

function formatDateForInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

export default function GetInvoice() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editItems, setEditItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = invoices.filter((invoice) => {
      if (!q) return true;

      return (
        String(invoice.invoice_no || "").toLowerCase().includes(q) ||
        String(invoice.buyer_name || "").toLowerCase().includes(q) ||
        String(invoice.buyer_gstin || "").toLowerCase().includes(q) ||
        String(invoice.grand_total || "").toLowerCase().includes(q)
      );
    });

    if (sortBy === "newest") {
      list = [...list].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }

    if (sortBy === "oldest") {
      list = [...list].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    }

    if (sortBy === "high") {
      list = [...list].sort(
        (a, b) => Number(b.grand_total || 0) - Number(a.grand_total || 0)
      );
    }

    if (sortBy === "low") {
      list = [...list].sort(
        (a, b) => Number(a.grand_total || 0) - Number(b.grand_total || 0)
      );
    }

    return list;
  }, [invoices, search, sortBy]);

  const dashboardStats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce(
      (sum, item) => sum + Number(item.grand_total || 0),
      0
    );
    const totalTax = invoices.reduce(
      (sum, item) => sum + Number(item.igst_amount || 0),
      0
    );
    const latestInvoice = invoices[0]?.invoice_no || "-";

    return {
      totalInvoices,
      totalAmount,
      totalTax,
      latestInvoice,
    };
  }, [invoices]);

  const editTotals = useMemo(() => {
    const taxableAmount = editItems.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.rate || 0);
    }, 0);

    const igstAmount = taxableAmount * (Number(editForm.igst_rate || 0) / 100);
    const grandTotalBeforeRound = taxableAmount + igstAmount;
    const grandTotal = Math.round(grandTotalBeforeRound);
    const roundUp = grandTotal - grandTotalBeforeRound;

    return {
      taxableAmount,
      igstAmount,
      roundUp,
      grandTotal,
    };
  }, [editItems, editForm.igst_rate]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  async function fetchInvoices() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/invoices`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch invoices");
      }

      setInvoices(data.data || []);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function openInvoiceDetails(invoiceId) {
    try {
      setDetailsLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch invoice details");
      }

      setSelectedInvoice({
        ...data.invoice,
        items: data.items || [],
      });
    } catch (err) {
      showToast(err.message || "Failed to load invoice details");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openEditModal(invoiceId) {
    try {
      setDetailsLoading(true);
      setFormErrors({});
      setItemErrors([]);

      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch invoice");
      }

      const invoice = data.invoice;
      const items = data.items || [];

      setSelectedInvoice({
        ...invoice,
        items,
      });

      setEditForm({
        invoice_no: invoice.invoice_no || "",
        invoice_date: formatDateForInput(invoice.invoice_date),
        igst_rate: invoice.igst_rate || 5,

        supplier_name: invoice.supplier_name || "",
        supplier_address: invoice.supplier_address || "",
        supplier_gstin: invoice.supplier_gstin || "",
        supplier_state_name: invoice.supplier_state_name || "",
        supplier_state_code: invoice.supplier_state_code || "",

        consignee_name: invoice.consignee_name || "",
        consignee_state_name: invoice.consignee_state_name || "",
        consignee_state_code: invoice.consignee_state_code || "",

        buyer_name: invoice.buyer_name || "",
        buyer_gstin: invoice.buyer_gstin || "",
        buyer_state_name: invoice.buyer_state_name || "",
        buyer_state_code: invoice.buyer_state_code || "",
        buyer_address: invoice.buyer_address || "",

        bank_name: invoice.bank_name || "",
        bank_account_no: invoice.bank_account_no || "",
        bank_branch: invoice.bank_branch || "",
        bank_ifsc: invoice.bank_ifsc || "",
      });

      setEditItems(
        items.map((item, index) => ({
          sr_no: item.sr_no || index + 1,
          description: item.description || "",
          hsn_sac: item.hsn_sac || "251710",
          gst_rate: item.gst_rate || invoice.igst_rate || 5,
          quantity: item.quantity || "",
          rate: item.rate || "",
          per: item.per || "Brass",
        }))
      );

      setShowEditModal(true);
    } catch (err) {
      showToast(err.message || "Failed to open edit form");
    } finally {
      setDetailsLoading(false);
    }
  }

  function updateEditField(name, value) {
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

    if (name === "igst_rate") {
      setEditItems((prev) =>
        prev.map((item) => ({
          ...item,
          gst_rate: value,
        }))
      );
    }
  }

  function updateEditItem(index, name, value) {
    setEditItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [name]: value,
      };
      return next;
    });

    setItemErrors((prev) => {
      const next = [...prev];
      if (next[index]) delete next[index][name];
      return next;
    });
  }

  function addEditItem() {
    if (editItems.length >= 8) {
      showToast("Maximum 8 material rows allowed for one-page A4 PDF");
      return;
    }

    setEditItems((prev) => [
      ...prev,
      {
        sr_no: prev.length + 1,
        description: "",
        hsn_sac: "251710",
        gst_rate: Number(editForm.igst_rate || 5),
        quantity: "",
        rate: "",
        per: "Brass",
      },
    ]);
  }

  function removeEditItem(index) {
    if (editItems.length === 1) {
      showToast("At least one material row is required");
      return;
    }

    setEditItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({
          ...item,
          sr_no: i + 1,
        }))
    );
  }

  function validateEditForm() {
    const errors = {};
    const itemsErrors = [];

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
      "bank_name",
      "bank_account_no",
      "bank_branch",
      "bank_ifsc",
    ];

    requiredFields.forEach((field) => {
      if (!String(editForm[field] || "").trim()) {
        errors[field] = "Required";
      }
    });

    if (Number(editForm.igst_rate) < 0 || Number.isNaN(Number(editForm.igst_rate))) {
      errors.igst_rate = "Invalid GST rate";
    }

    if (!editItems.length) {
      errors.items = "At least one material row required";
    }

    editItems.forEach((item, index) => {
      const itemError = {};

      if (!String(item.description || "").trim()) {
        itemError.description = "Required";
      }

      if (!String(item.hsn_sac || "").trim()) {
        itemError.hsn_sac = "Required";
      }

      if (Number(item.quantity) <= 0 || Number.isNaN(Number(item.quantity))) {
        itemError.quantity = "Invalid";
      }

      if (Number(item.rate) <= 0 || Number.isNaN(Number(item.rate))) {
        itemError.rate = "Invalid";
      }

      if (!String(item.per || "").trim()) {
        itemError.per = "Required";
      }

      itemsErrors[index] = itemError;
    });

    setFormErrors(errors);
    setItemErrors(itemsErrors);

    const hasFormError = Object.keys(errors).length > 0;
    const hasItemError = itemsErrors.some((err) => Object.keys(err).length > 0);

    if (hasFormError || hasItemError) {
      showToast("Please correct required fields");
      return false;
    }

    return true;
  }

  function buildUpdatePayload() {
    return {
      ...editForm,
      igst_rate: Number(editForm.igst_rate || 0),
      items: editItems.map((item, index) => ({
        sr_no: index + 1,
        description: item.description,
        hsn_sac: item.hsn_sac || "251710",
        gst_rate: Number(item.gst_rate || editForm.igst_rate || 5),
        quantity: Number(item.quantity || 0),
        rate: Number(item.rate || 0),
        per: item.per || "Brass",
      })),
    };
  }

  async function updateInvoice() {
    if (!selectedInvoice?.id) return;
    if (!validateEditForm()) return;

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/invoices/${selectedInvoice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildUpdatePayload()),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update invoice");
      }

      showToast("Invoice updated successfully");
      setShowEditModal(false);
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (err) {
      showToast(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf(invoice) {
    try {
      setPdfLoadingId(invoice.id);

      const response = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/pdf`);

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const fileName = `invoice-${invoice.invoice_no || invoice.id}.pdf`.replaceAll(
        "/",
        "-"
      );

      downloadBlob(blob, fileName);
      showToast("PDF downloaded successfully");
    } catch (err) {
      showToast(err.message || "PDF download failed");
    } finally {
      setPdfLoadingId(null);
    }
  }

  async function deleteInvoice() {
    if (!deleteConfirm?.id) return;

    try {
      setDeleteLoadingId(deleteConfirm.id);

      const response = await fetch(`${API_BASE_URL}/invoices/${deleteConfirm.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete invoice");
      }

      setInvoices((prev) => prev.filter((item) => item.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      setSelectedInvoice(null);
      showToast("Invoice deleted successfully");
    } catch (err) {
      showToast(err.message || "Delete failed");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  return (
    <div className="invoice-list-page">
      <style>{styles}</style>

      {toast && <div className="toast">{toast}</div>}

      <header className="page-header">
        <div className="header-copy">
          <p className="eyebrow">INVOICE MANAGEMENT</p>
          <h1>Saved Invoice Bills</h1>
          <p className="subtitle">
            View, update, delete and download saved GST invoice bills.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-light" onClick={fetchInvoices} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="Total Invoices" value={dashboardStats.totalInvoices} />
        <StatCard label="Total Billing" value={`₹ ${money(dashboardStats.totalAmount)}`} />
        <StatCard label="Total IGST" value={`₹ ${money(dashboardStats.totalTax)}`} />
        <StatCard label="Latest Invoice" value={dashboardStats.latestInvoice} />
      </section>

      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>Invoice Records</h2>
            <p>{filteredInvoices.length} invoice found</p>
          </div>

          <div className="filters">
            <input
              type="text"
              placeholder="Search invoice no, buyer, GSTIN, amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="high">Amount High to Low</option>
              <option value="low">Amount Low to High</option>
            </select>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <h3>No invoices found</h3>
            <p>Create invoice first, then it will appear here.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap desktop-table">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Buyer</th>
                    <th>GSTIN</th>
                    <th>Taxable</th>
                    <th>IGST</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.invoice_no}</strong>
                        <small>ID #{invoice.id}</small>
                      </td>
                      <td>{formatDate(invoice.invoice_date)}</td>
                      <td className="buyer-cell">{invoice.buyer_name}</td>
                      <td>{invoice.buyer_gstin}</td>
                      <td>₹ {money(invoice.taxable_amount)}</td>
                      <td>₹ {money(invoice.igst_amount)}</td>
                      <td>
                        <strong>₹ {money(invoice.grand_total)}</strong>
                      </td>
                      <td>
                        <ActionButtons
                          invoice={invoice}
                          openInvoiceDetails={openInvoiceDetails}
                          openEditModal={openEditModal}
                          downloadPdf={downloadPdf}
                          pdfLoadingId={pdfLoadingId}
                          setDeleteConfirm={setDeleteConfirm}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {filteredInvoices.map((invoice) => (
                <article className="invoice-card" key={invoice.id}>
                  <div className="invoice-card-head">
                    <div>
                      <span>Invoice No</span>
                      <strong>{invoice.invoice_no}</strong>
                      <small>ID #{invoice.id}</small>
                    </div>
                    <div className="amount-pill">₹ {money(invoice.grand_total)}</div>
                  </div>

                  <div className="invoice-card-grid">
                    <MobileInfo label="Date" value={formatDate(invoice.invoice_date)} />
                    <MobileInfo label="Buyer" value={invoice.buyer_name} />
                    <MobileInfo label="GSTIN" value={invoice.buyer_gstin} />
                    <MobileInfo label="Taxable" value={`₹ ${money(invoice.taxable_amount)}`} />
                    <MobileInfo label="IGST" value={`₹ ${money(invoice.igst_amount)}`} />
                  </div>

                  <ActionButtons
                    invoice={invoice}
                    openInvoiceDetails={openInvoiceDetails}
                    openEditModal={openEditModal}
                    downloadPdf={downloadPdf}
                    pdfLoadingId={pdfLoadingId}
                    setDeleteConfirm={setDeleteConfirm}
                    mobile
                  />
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {selectedInvoice && !showEditModal && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="modal view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">INVOICE DETAILS</p>
                <h2>{selectedInvoice.invoice_no}</h2>
              </div>

              <button className="close-btn" onClick={() => setSelectedInvoice(null)}>
                ×
              </button>
            </div>

            {detailsLoading ? (
              <div className="empty-state">Loading details...</div>
            ) : (
              <>
                <div className="details-grid">
                  <Detail label="Date" value={formatDate(selectedInvoice.invoice_date)} />
                  <Detail label="Buyer" value={selectedInvoice.buyer_name} />
                  <Detail label="Buyer GSTIN" value={selectedInvoice.buyer_gstin} />
                  <Detail label="Supplier" value={selectedInvoice.supplier_name} />
                  <Detail label="Taxable" value={`₹ ${money(selectedInvoice.taxable_amount)}`} />
                  <Detail label="IGST" value={`₹ ${money(selectedInvoice.igst_amount)}`} />
                  <Detail label="Round Up" value={`₹ ${money(selectedInvoice.round_up)}`} />
                  <Detail label="Grand Total" value={`₹ ${money(selectedInvoice.grand_total)}`} />
                </div>

                <h3 className="modal-subtitle">Material Details</h3>

                <div className="mini-table-wrap">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Sr</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Per</th>
                        <th>Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedInvoice.items || []).map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{index + 1}</td>
                          <td>{item.description}</td>
                          <td>{Number(item.quantity || 0).toFixed(2)}</td>
                          <td>{Number(item.rate || 0).toFixed(0)}</td>
                          <td>{item.per}</td>
                          <td>₹ {money(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="modal-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => openEditModal(selectedInvoice.id)}
                  >
                    Edit Invoice
                  </button>

                  <button
                    className="btn btn-dark"
                    onClick={() => downloadPdf(selectedInvoice)}
                  >
                    Download PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal edit-modal">
            <div className="modal-header sticky-header">
              <div>
                <p className="eyebrow">UPDATE INVOICE</p>
                <h2>Edit Invoice Bill</h2>
              </div>

              <button
                className="close-btn"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedInvoice(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="edit-content">
              <div className="form-section">
                <h3>Invoice Details</h3>

                <div className="form-grid three">
                  <Input
                    label="Invoice No"
                    name="invoice_no"
                    value={editForm.invoice_no}
                    onChange={updateEditField}
                    error={formErrors.invoice_no}
                    required
                  />

                  <Input
                    label="Invoice Date"
                    name="invoice_date"
                    type="date"
                    value={editForm.invoice_date}
                    onChange={updateEditField}
                    error={formErrors.invoice_date}
                    required
                  />

                  <Input
                    label="IGST Rate %"
                    name="igst_rate"
                    type="number"
                    value={editForm.igst_rate}
                    onChange={updateEditField}
                    error={formErrors.igst_rate}
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Supplier Details</h3>

                <div className="form-grid two">
                  <Input
                    label="Supplier Name"
                    name="supplier_name"
                    value={editForm.supplier_name}
                    onChange={updateEditField}
                    error={formErrors.supplier_name}
                    required
                  />

                  <Input
                    label="Supplier GSTIN"
                    name="supplier_gstin"
                    value={editForm.supplier_gstin}
                    onChange={updateEditField}
                    error={formErrors.supplier_gstin}
                    required
                  />

                  <Textarea
                    label="Supplier Address"
                    name="supplier_address"
                    value={editForm.supplier_address}
                    onChange={updateEditField}
                    error={formErrors.supplier_address}
                    required
                  />

                  <div className="form-grid two inner">
                    <Input
                      label="State"
                      name="supplier_state_name"
                      value={editForm.supplier_state_name}
                      onChange={updateEditField}
                      error={formErrors.supplier_state_name}
                      required
                    />

                    <Input
                      label="Code"
                      name="supplier_state_code"
                      value={editForm.supplier_state_code}
                      onChange={updateEditField}
                      error={formErrors.supplier_state_code}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Buyer / Consignee Details</h3>

                <div className="form-grid two">
                  <Input
                    label="Consignee Name"
                    name="consignee_name"
                    value={editForm.consignee_name}
                    onChange={updateEditField}
                    error={formErrors.consignee_name}
                    required
                  />

                  <div className="form-grid two inner">
                    <Input
                      label="Consignee State"
                      name="consignee_state_name"
                      value={editForm.consignee_state_name}
                      onChange={updateEditField}
                    />

                    <Input
                      label="Consignee Code"
                      name="consignee_state_code"
                      value={editForm.consignee_state_code}
                      onChange={updateEditField}
                    />
                  </div>

                  <Input
                    label="Buyer Name"
                    name="buyer_name"
                    value={editForm.buyer_name}
                    onChange={updateEditField}
                    error={formErrors.buyer_name}
                    required
                  />

                  <Input
                    label="Buyer GSTIN"
                    name="buyer_gstin"
                    value={editForm.buyer_gstin}
                    onChange={updateEditField}
                    error={formErrors.buyer_gstin}
                    required
                  />

                  <Textarea
                    label="Buyer Address"
                    name="buyer_address"
                    value={editForm.buyer_address}
                    onChange={updateEditField}
                    error={formErrors.buyer_address}
                    required
                  />

                  <div className="form-grid two inner">
                    <Input
                      label="Buyer State"
                      name="buyer_state_name"
                      value={editForm.buyer_state_name}
                      onChange={updateEditField}
                    />

                    <Input
                      label="Buyer Code"
                      name="buyer_state_code"
                      value={editForm.buyer_state_code}
                      onChange={updateEditField}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Bank Details</h3>

                <div className="form-grid four">
                  <Input
                    label="Bank Name"
                    name="bank_name"
                    value={editForm.bank_name}
                    onChange={updateEditField}
                    error={formErrors.bank_name}
                    required
                  />

                  <Input
                    label="A/c No"
                    name="bank_account_no"
                    value={editForm.bank_account_no}
                    onChange={updateEditField}
                    error={formErrors.bank_account_no}
                    required
                  />

                  <Input
                    label="Branch"
                    name="bank_branch"
                    value={editForm.bank_branch}
                    onChange={updateEditField}
                    error={formErrors.bank_branch}
                    required
                  />

                  <Input
                    label="IFSC"
                    name="bank_ifsc"
                    value={editForm.bank_ifsc}
                    onChange={updateEditField}
                    error={formErrors.bank_ifsc}
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="section-row">
                  <h3>Material Details</h3>

                  <button className="btn btn-primary small" onClick={addEditItem}>
                    + Add Material
                  </button>
                </div>

                <div className="edit-table-wrap">
                  <table className="edit-items-table">
                    <thead>
                      <tr>
                        <th>Sr</th>
                        <th>Description</th>
                        <th>HSN/SAC</th>
                        <th>GST %</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Per</th>
                        <th>Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {editItems.map((item, index) => {
                        const amount =
                          Number(item.quantity || 0) * Number(item.rate || 0);

                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>

                            <td>
                              <TableInput
                                value={item.description}
                                onChange={(value) =>
                                  updateEditItem(index, "description", value)
                                }
                                error={itemErrors[index]?.description}
                              />
                            </td>

                            <td>
                              <TableInput
                                value={item.hsn_sac}
                                onChange={(value) =>
                                  updateEditItem(index, "hsn_sac", value)
                                }
                                error={itemErrors[index]?.hsn_sac}
                              />
                            </td>

                            <td>
                              <TableInput
                                type="number"
                                value={item.gst_rate}
                                onChange={(value) =>
                                  updateEditItem(index, "gst_rate", value)
                                }
                              />
                            </td>

                            <td>
                              <TableInput
                                type="number"
                                value={item.quantity}
                                onChange={(value) =>
                                  updateEditItem(index, "quantity", value)
                                }
                                error={itemErrors[index]?.quantity}
                              />
                            </td>

                            <td>
                              <TableInput
                                type="number"
                                value={item.rate}
                                onChange={(value) =>
                                  updateEditItem(index, "rate", value)
                                }
                                error={itemErrors[index]?.rate}
                              />
                            </td>

                            <td>
                              <TableInput
                                value={item.per}
                                onChange={(value) =>
                                  updateEditItem(index, "per", value)
                                }
                                error={itemErrors[index]?.per}
                              />
                            </td>

                            <td className="amount-cell">₹ {money(amount)}</td>

                            <td>
                              <button
                                className="remove-btn"
                                onClick={() => removeEditItem(index)}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="total-box">
                  <div>
                    <span>Taxable</span>
                    <strong>₹ {money(editTotals.taxableAmount)}</strong>
                  </div>

                  <div>
                    <span>IGST</span>
                    <strong>₹ {money(editTotals.igstAmount)}</strong>
                  </div>

                  <div>
                    <span>Round Up</span>
                    <strong>₹ {money(editTotals.roundUp)}</strong>
                  </div>

                  <div className="grand">
                    <span>Grand Total</span>
                    <strong>₹ {money(editTotals.grandTotal)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedInvoice(null);
                }}
              >
                Cancel
              </button>

              <button className="btn btn-primary" onClick={updateInvoice} disabled={saving}>
                {saving ? "Updating..." : "Update Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-backdrop">
          <div className="delete-modal">
            <div className="delete-icon">!</div>
            <h2>Delete Invoice?</h2>
            <p>
              Are you sure you want to delete invoice{" "}
              <b>{deleteConfirm.invoice_no}</b>? This action cannot be undone.
            </p>

            <div className="delete-actions">
              <button
                className="btn btn-outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoadingId === deleteConfirm.id}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                onClick={deleteInvoice}
                disabled={deleteLoadingId === deleteConfirm.id}
              >
                {deleteLoadingId === deleteConfirm.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButtons({
  invoice,
  openInvoiceDetails,
  openEditModal,
  downloadPdf,
  pdfLoadingId,
  setDeleteConfirm,
  mobile = false,
}) {
  return (
    <div className={`action-group ${mobile ? "mobile-action-group" : ""}`}>
      <button
        className="icon-action view"
        onClick={() => openInvoiceDetails(invoice.id)}
        title="View"
      >
        View
      </button>

      <button
        className="icon-action edit"
        onClick={() => openEditModal(invoice.id)}
        title="Edit"
      >
        Edit
      </button>

      <button
        className="icon-action pdf"
        onClick={() => downloadPdf(invoice)}
        disabled={pdfLoadingId === invoice.id}
        title="Download PDF"
      >
        {pdfLoadingId === invoice.id ? "PDF..." : "PDF"}
      </button>

      <button
        className="icon-action delete"
        onClick={() => setDeleteConfirm(invoice)}
        title="Delete"
      >
        Delete
      </button>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-card">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function MobileInfo({ label, value }) {
  return (
    <div className="mobile-info">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
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
  required,
}) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>
        {label} {required && <em>*</em>}
      </span>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(name, e.target.value)}
      />
      {error && <small>{error}</small>}
    </label>
  );
}

function Textarea({ label, name, value, onChange, error, required }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>
        {label} {required && <em>*</em>}
      </span>
      <textarea
        rows="4"
        value={value || ""}
        onChange={(e) => onChange(name, e.target.value)}
      />
      {error && <small>{error}</small>}
    </label>
  );
}

function TableInput({ value, onChange, error, type = "text" }) {
  return (
    <div className={`table-field ${error ? "has-error" : ""}`}>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <small>{error}</small>}
    </div>
  );
}

const styles = `
.invoice-list-page {
  min-height: 100vh;
  padding: 24px;
  padding-top: max(24px, env(safe-area-inset-top));
  padding-bottom: max(28px, env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 30rem),
    linear-gradient(135deg, #f8fafc, #eef2ff);
  color: #111827;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

.page-header {
  max-width: 1480px;
  margin: 0 auto 18px;
  padding: 22px 24px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 18px 55px rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.header-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 7px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.15em;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-size: clamp(24px, 3vw, 36px);
  letter-spacing: -0.04em;
  line-height: 1.12;
}

.subtitle {
  margin-top: 7px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.stats-grid {
  max-width: 1480px;
  margin: 0 auto 18px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  min-width: 0;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 14px 35px rgba(15, 23, 42, 0.06);
  border-radius: 22px;
  padding: 16px;
  overflow: hidden;
}

.stat-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 6px;
  white-space: nowrap;
}

.stat-card strong {
  display: block;
  font-size: clamp(18px, 2.2vw, 23px);
  letter-spacing: -0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel {
  max-width: 1480px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 18px 55px rgba(15, 23, 42, 0.08);
  border-radius: 26px;
  padding: 22px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar h2 {
  font-size: 21px;
  letter-spacing: -0.02em;
}

.toolbar p {
  margin-top: 4px;
  color: #64748b;
  font-size: 14px;
}

.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filters input,
.filters select {
  height: 43px;
  border: 1px solid #dbe3ef;
  background: #f8fafc;
  border-radius: 14px;
  padding: 0 13px;
  outline: none;
  font-weight: 700;
  min-width: 250px;
}

.filters select {
  min-width: 170px;
}

.filters input:focus,
.filters select:focus {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.11);
}

.btn {
  border: none;
  min-height: 42px;
  padding: 10px 15px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 900;
  transition: 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22);
}

.btn-dark {
  background: linear-gradient(135deg, #111827, #334155);
  color: white;
}

.btn-light {
  background: #dbeafe;
  color: #1d4ed8;
}

.btn-outline {
  background: white;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-danger {
  background: #dc2626;
  color: white;
  box-shadow: 0 10px 24px rgba(220, 38, 38, 0.2);
}

.btn.small {
  min-height: 38px;
  padding: 8px 12px;
  font-size: 13px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
}

.invoice-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: separate;
  border-spacing: 0;
}

.invoice-table th {
  background: #111827;
  color: white;
  padding: 13px 12px;
  text-align: left;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.invoice-table td {
  padding: 13px 12px;
  border-top: 1px solid #e2e8f0;
  background: white;
  vertical-align: middle;
  font-size: 14px;
}

.invoice-table tbody tr:hover td {
  background: #f8fafc;
}

.invoice-table td small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.buyer-cell {
  max-width: 250px;
  font-weight: 800;
  white-space: normal;
  word-break: break-word;
}

.action-group {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.icon-action {
  border: none;
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 900;
  min-height: 34px;
}

.icon-action.view {
  background: #e0f2fe;
  color: #0369a1;
}

.icon-action.edit {
  background: #fef3c7;
  color: #92400e;
}

.icon-action.pdf {
  background: #dcfce7;
  color: #166534;
}

.icon-action.delete {
  background: #fee2e2;
  color: #b91c1c;
}

.error-box {
  padding: 14px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 16px;
  font-weight: 800;
  margin-bottom: 16px;
}

.empty-state {
  padding: 44px 18px;
  text-align: center;
  color: #64748b;
}

.empty-state h3 {
  color: #111827;
  margin-bottom: 8px;
}

.toast {
  position: fixed;
  top: max(18px, env(safe-area-inset-top));
  right: 18px;
  z-index: 9999;
  background: #111827;
  color: white;
  padding: 13px 17px;
  border-radius: 16px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.24);
  font-weight: 900;
  max-width: min(360px, calc(100vw - 32px));
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(7px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(18px, env(safe-area-inset-top))
    18px
    max(18px, env(safe-area-inset-bottom));
}

.modal {
  width: min(1100px, calc(100vw - 36px));
  max-height: calc(100dvh - 36px);
  overflow: hidden;
  background: white;
  border-radius: 26px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: modalPop 0.18s ease-out;
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.view-modal {
  padding: 22px;
  overflow-y: auto;
}

.edit-modal {
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.sticky-header {
  padding: 20px 22px;
  background: white;
  flex-shrink: 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 14px;
  background: #f1f5f9;
  color: #334155;
  font-size: 27px;
  cursor: pointer;
  flex-shrink: 0;
}

.details-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.detail-card {
  min-width: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 17px;
  padding: 14px;
}

.detail-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 7px;
}

.detail-card strong {
  display: block;
  font-size: 14px;
  word-break: break-word;
}

.modal-subtitle {
  margin-top: 22px;
  margin-bottom: 12px;
}

.mini-table-wrap {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
}

.mini-table {
  width: 100%;
  min-width: 650px;
  border-collapse: separate;
  border-spacing: 0;
}

.mini-table th {
  background: #f1f5f9;
  color: #334155;
  padding: 11px;
  text-align: left;
  font-size: 11.5px;
  text-transform: uppercase;
  white-space: nowrap;
}

.mini-table td {
  border-top: 1px solid #e2e8f0;
  padding: 11px;
  font-size: 14px;
}

.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.edit-content {
  overflow-y: auto;
  padding: 22px;
  overscroll-behavior: contain;
}

.form-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-section h3 {
  margin-bottom: 14px;
  font-size: 17px;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.section-row h3 {
  margin-bottom: 0;
}

.form-grid {
  display: grid;
  gap: 13px;
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field span {
  color: #334155;
  font-size: 12.5px;
  font-weight: 900;
}

.field em {
  color: #dc2626;
  font-style: normal;
}

.field input,
.field textarea,
.table-field input {
  width: 100%;
  border: 1px solid #dbe3ef;
  background: white;
  border-radius: 14px;
  outline: none;
  padding: 11px 12px;
  font-size: 14px;
  transition: 0.15s ease;
}

.field textarea {
  resize: vertical;
  min-height: 88px;
}

.field input:focus,
.field textarea:focus,
.table-field input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.11);
}

.field small,
.table-field small {
  color: #dc2626;
  font-size: 11px;
  font-weight: 800;
}

.has-error input,
.has-error textarea {
  border-color: #ef4444 !important;
  background: #fff7f7 !important;
}

.edit-table-wrap {
  overflow-x: auto;
  border: 1px solid #dbe3ef;
  border-radius: 18px;
}

.edit-items-table {
  width: 100%;
  min-width: 1020px;
  border-collapse: separate;
  border-spacing: 0;
}

.edit-items-table th {
  background: #111827;
  color: white;
  padding: 11px 10px;
  text-align: left;
  font-size: 11.5px;
  white-space: nowrap;
}

.edit-items-table td {
  border-top: 1px solid #e2e8f0;
  background: white;
  padding: 8px;
  vertical-align: top;
}

.table-field input {
  border-radius: 11px;
  padding: 9px 10px;
}

.amount-cell {
  white-space: nowrap;
  font-weight: 900;
  text-align: right;
  padding-top: 16px !important;
}

.remove-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 11px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
}

.total-box {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.total-box div {
  min-width: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 17px;
  padding: 13px;
}

.total-box span {
  display: block;
  color: #64748b;
  font-size: 11.5px;
  font-weight: 900;
  margin-bottom: 5px;
}

.total-box strong {
  font-size: 16px;
  word-break: break-word;
}

.total-box .grand {
  background: #111827;
  color: white;
}

.total-box .grand span {
  color: #dbeafe;
}

.modal-footer {
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 16px 22px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

.delete-modal {
  width: min(420px, calc(100vw - 36px));
  background: white;
  border-radius: 26px;
  padding: 26px;
  text-align: center;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.3);
  animation: modalPop 0.18s ease-out;
}

.delete-icon {
  width: 58px;
  height: 58px;
  margin: 0 auto 15px;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 900;
}

.delete-modal p {
  margin-top: 12px;
  color: #64748b;
  line-height: 1.6;
}

.delete-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
}

.mobile-cards {
  display: none;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters {
    width: 100%;
  }

  .filters input,
  .filters select {
    flex: 1;
    min-width: 220px;
  }

  .details-grid,
  .form-grid.four,
  .form-grid.three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .total-box {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .invoice-list-page {
    padding: 12px;
    padding-top: max(12px, env(safe-area-inset-top));
    padding-bottom: max(90px, env(safe-area-inset-bottom));
  }

  .page-header {
    flex-direction: row;
    align-items: center;
    border-radius: 20px;
    padding: 14px;
    gap: 10px;
    margin-bottom: 12px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .subtitle {
    font-size: 12px;
    line-height: 1.35;
  }

  .eyebrow {
    font-size: 9.5px;
    margin-bottom: 5px;
  }

  .header-actions {
    flex-shrink: 0;
  }

  .header-actions .btn {
    min-height: 36px;
    padding: 8px 11px;
    font-size: 12px;
    border-radius: 12px;
    width: auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-bottom: 12px;
  }

  .stat-card {
    border-radius: 16px;
    padding: 11px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  }

  .stat-card span {
    font-size: 10.5px;
    margin-bottom: 4px;
  }

  .stat-card strong {
    font-size: 15px;
  }

  .panel {
    border-radius: 20px;
    padding: 14px;
  }

  .toolbar {
    gap: 12px;
    margin-bottom: 12px;
  }

  .toolbar h2 {
    font-size: 18px;
  }

  .toolbar p {
    font-size: 12px;
  }

  .filters {
    flex-direction: column;
    gap: 9px;
  }

  .filters input,
  .filters select {
    width: 100%;
    min-width: 0;
    height: 40px;
    border-radius: 12px;
    font-size: 13px;
  }

  .desktop-table {
    display: none;
  }

  .mobile-cards {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .invoice-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 13px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  }

  .invoice-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eef2f7;
  }

  .invoice-card-head span,
  .mobile-info span {
    display: block;
    color: #64748b;
    font-size: 10.5px;
    font-weight: 900;
    margin-bottom: 4px;
  }

  .invoice-card-head strong {
    display: block;
    font-size: 16px;
    color: #111827;
    word-break: break-word;
  }

  .invoice-card-head small {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: #64748b;
  }

  .amount-pill {
    flex-shrink: 0;
    background: #111827;
    color: white;
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
  }

  .invoice-card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    margin-top: 11px;
  }

  .mobile-info {
    min-width: 0;
    background: #f8fafc;
    border: 1px solid #edf2f7;
    border-radius: 13px;
    padding: 9px;
  }

  .mobile-info strong {
    display: block;
    font-size: 12.5px;
    color: #111827;
    word-break: break-word;
  }

  .mobile-action-group {
    margin-top: 11px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
  }

  .mobile-action-group .icon-action {
    width: 100%;
    padding: 8px 5px;
    font-size: 11.5px;
    min-height: 34px;
  }

  .modal-backdrop {
    align-items: center;
    justify-content: center;
    padding:
      max(14px, env(safe-area-inset-top))
      12px
      max(14px, env(safe-area-inset-bottom));
  }

  .modal {
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 28px);
    border-radius: 20px;
  }

  .view-modal {
    padding: 16px;
  }

  .modal-header {
    padding-bottom: 12px;
  }

  .modal-header h2 {
    font-size: 18px;
    word-break: break-word;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    font-size: 25px;
  }

  .details-grid,
  .form-grid.two,
  .form-grid.three,
  .form-grid.four,
  .total-box {
    grid-template-columns: 1fr;
  }

  .details-grid {
    gap: 9px;
    margin-top: 14px;
  }

  .detail-card {
    border-radius: 14px;
    padding: 11px;
  }

  .detail-card strong {
    font-size: 13px;
  }

  .mini-table {
    min-width: 560px;
  }

  .modal-actions,
  .modal-footer,
  .delete-actions {
    flex-direction: column;
  }

  .modal-actions .btn,
  .modal-footer .btn,
  .delete-actions .btn {
    width: 100%;
  }

  .sticky-header {
    padding: 15px;
  }

  .edit-content {
    padding: 14px;
  }

  .form-section {
    border-radius: 17px;
    padding: 13px;
    margin-bottom: 12px;
  }

  .form-section h3 {
    font-size: 15px;
    margin-bottom: 12px;
  }

  .section-row {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
  }

  .section-row .btn {
    width: 100%;
  }

  .field span {
    font-size: 12px;
  }

  .field input,
  .field textarea,
  .table-field input {
    padding: 10px 11px;
    font-size: 13px;
    border-radius: 12px;
  }

  .edit-table-wrap {
    border-radius: 15px;
  }

  .edit-items-table {
    min-width: 940px;
  }

  .total-box {
    gap: 8px;
  }

  .total-box div {
    border-radius: 14px;
    padding: 10px;
  }

  .total-box strong {
    font-size: 14px;
  }

  .modal-footer {
    padding: 12px 14px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }

  .delete-modal {
    width: calc(100vw - 28px);
    border-radius: 20px;
    padding: 20px;
  }

  .delete-modal h2 {
    font-size: 20px;
  }

  .delete-modal p {
    font-size: 13px;
  }

  .delete-icon {
    width: 52px;
    height: 52px;
    font-size: 28px;
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

  .btn {
    min-height: 40px;
    font-size: 13px;
  }
}

@media (max-width: 380px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions,
  .header-actions .btn {
    width: 100%;
  }

  .invoice-card-grid {
    grid-template-columns: 1fr;
  }

  .mobile-action-group {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-grid {
    gap: 8px;
  }

  .stat-card strong {
    font-size: 14px;
  }
}
`;