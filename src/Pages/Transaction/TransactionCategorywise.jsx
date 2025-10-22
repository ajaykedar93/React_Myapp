// src/pages/TransactionCategorywise.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpiner from "../Entertainment/LoadingSpiner.jsx";

// Allow env override; fallback to localhost
const API_BASE =
  (import.meta?.env?.VITE_API_BASE &&
    `${import.meta.env.VITE_API_BASE}/transaction-category`) ||
  "http://localhost:5000/api/transaction-category";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/* ---------------- Centered Modal ---------------- */
const CenterModal = ({
  show,
  title,
  children,
  footer,
  onClose,
  size = "md", // "sm" | "md" | "lg"
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="modal d-block"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={onClose}
        >
          <motion.div
            className={`modal-dialog modal-dialog-centered modal-${size}`}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content shadow-lg border-0 rounded-4">
              {title && (
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">{title}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={onClose}
                  />
                </div>
              )}
              <div className="modal-body">{children}</div>
              {footer && (
                <div className="modal-footer border-0 pt-0">{footer}</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ---------------- Page ---------------- */
const TransactionCategorywise = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [transactionsByDate, setTransactionsByDate] = useState([]);
  const [monthlyTotals, setMonthlyTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Modals & notifications
  const [downloadSuccess, setDownloadSuccess] = useState(null); // {filename}
  const [errorMsg, setErrorMsg] = useState(null); // string message
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const closeAllModals = () => {
    setDownloadSuccess(null);
    setErrorMsg(null);
    setEmailModalOpen(false);
    setEmailError("");
  };

  // AbortControllers
  const categoriesCtrl = useRef(null);
  const subcategoriesCtrl = useRef(null);
  const dataCtrl = useRef(null);
  const totalsCtrl = useRef(null);

  // Fetch categories
  useEffect(() => {
    categoriesCtrl.current?.abort?.();
    const ctrl = new AbortController();
    categoriesCtrl.current = ctrl;

    fetch(`${API_BASE}/categories`, { signal: ctrl.signal })
      .then((res) => res.json())
      .then((data) =>
        Array.isArray(data) ? setCategories(data) : setCategories(data?.data || [])
      )
      .catch((e) => {
        if (e.name !== "AbortError") console.error("Categories error:", e);
      });

    return () => ctrl.abort();
  }, []);

  // Fetch subcategories on category change
  useEffect(() => {
    setSubcategories([]);
    setSelectedSubcategory("");

    if (!selectedCategory) return;

    subcategoriesCtrl.current?.abort?.();
    const ctrl = new AbortController();
    subcategoriesCtrl.current = ctrl;

    fetch(`${API_BASE}/subcategories?category_id=${selectedCategory}`, {
      signal: ctrl.signal,
    })
      .then((res) => res.json())
      .then((data) =>
        Array.isArray(data) ? setSubcategories(data) : setSubcategories(data?.data || [])
      )
      .catch((e) => {
        if (e.name !== "AbortError") console.error("Subcategories error:", e);
      });

    return () => ctrl.abort();
  }, [selectedCategory]);

  // Build URLs
  const listUrl = useMemo(() => {
    if (!selectedCategory) return null;
    const qs = new URLSearchParams({ category_id: selectedCategory });
    if (selectedSubcategory) qs.set("subcategory_id", selectedSubcategory);
    if (selectedDate) {
      qs.set("start_date", selectedDate);
      qs.set("end_date", selectedDate);
    }
    return `${API_BASE}/transactions?${qs.toString()}`;
  }, [selectedCategory, selectedSubcategory, selectedDate]);

  const totalsUrl = useMemo(() => {
    if (!selectedCategory) return null;
    const qs = new URLSearchParams({ category_id: selectedCategory });
    if (selectedSubcategory) qs.set("subcategory_id", selectedSubcategory);
    return `${API_BASE}/transactions/monthly-total?${qs.toString()}`;
  }, [selectedCategory, selectedSubcategory]);

  // Fetch transactions + monthly totals
  const fetchTransactions = async () => {
    if (!listUrl) return;
    setLoading(true);
    setHasSearched(true);
    setErrorMsg(null);

    dataCtrl.current?.abort?.();
    totalsCtrl.current?.abort?.();
    const dCtrl = new AbortController();
    const tCtrl = new AbortController();
    dataCtrl.current = dCtrl;
    totalsCtrl.current = tCtrl;

    try {
      // list
      const res = await fetch(listUrl, { signal: dCtrl.signal });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      setTransactionsByDate(list);

      // monthly totals
      if (totalsUrl) {
        const resTotals = await fetch(totalsUrl, { signal: tCtrl.signal });
        const totals = await resTotals.json();
        const payload = totals?.data ?? totals ?? null;
        setMonthlyTotals(payload);
      } else {
        setMonthlyTotals(null);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Fetch error:", err);
        setErrorMsg("Something went wrong while fetching data.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto fetch when category picked and no date
  useEffect(() => {
    if (selectedCategory && !selectedDate) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSubcategory, selectedDate]);

  /* ---------------- Download PDF (with success modal) ---------------- */
  const handleDownloadPDF = async () => {
    if (!selectedCategory) return;

    const qs = new URLSearchParams({ category_id: selectedCategory });
    if (selectedSubcategory) qs.set("subcategory_id", selectedSubcategory);
    const url = `${API_BASE}/transactions/monthly-total/pdf?${qs.toString()}`;

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(url, {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error(`Failed to generate PDF (${res.status})`);
      }

      // Derive filename from header or fallback
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="(.+?)"/i);
      const filename = match?.[1] || "transactions.pdf";

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      setDownloadSuccess({ filename });
    } catch (err) {
      console.error("Download error:", err);
      setErrorMsg("Failed to download PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Email Modal Flow ---------------- */
  const openEmailModal = () => {
    if (!selectedCategory) return;
    setEmailValue("");
    setEmailError("");
    setEmailModalOpen(true);
  };

  const sendEmail = async () => {
    // light validation
    if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailSending(true);
    setEmailError("");
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/transactions/monthly-total/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailValue,
          category_id: selectedCategory,
          subcategory_id: selectedSubcategory || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send email.");
      }
      // success => show mini success modal
      setEmailModalOpen(false);
      setDownloadSuccess({
        filename: `Email sent to ${emailValue}`,
      });
    } catch (err) {
      console.error("Email send error:", err);
      setEmailError("Failed to send email. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="container py-4">
      <motion.h2
        className="text-center mb-4 fw-bold"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Transaction Category-wise Report
      </motion.h2>

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-md-3 mb-2">
          <label className="form-label fw-semibold">Category</label>
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">-- Select Category --</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3 mb-2">
          <label className="form-label fw-semibold">Subcategory</label>
          <select
            className="form-select"
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
            disabled={!selectedCategory}
          >
            <option value="">-- All Subcategories --</option>
            {subcategories.map((sc) => (
              <option key={sc.subcategory_id} value={sc.subcategory_id}>
                {sc.subcategory_name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3 mb-2">
          <label className="form-label fw-semibold">Select Date</label>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="col-md-3 d-flex align-items-end">
          <motion.button
            className="btn btn-primary w-100"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchTransactions}
            disabled={!selectedCategory || loading}
          >
            {loading ? "Loading..." : "Show"}
          </motion.button>
        </div>
      </div>

      {/* Loading */}
      {loading && <LoadingSpiner />}

      {/* Errors */}
      {!loading && errorMsg && (
        <div className="alert alert-danger text-center" role="alert">
          {errorMsg}
        </div>
      )}

      {/* No Data (only after a search attempt) */}
      {!loading && hasSearched && transactionsByDate.length === 0 && (
        <div className="text-center text-muted">No transactions found.</div>
      )}

      {/* Transaction Cards */}
      {transactionsByDate.map((day, idx) => {
        const dayTxns = day?.transactions || [];
        const color = dayTxns[0]?.category_color || "#000";
        const sum =
          day?.summary || { total_transactions: 0, total_debit: 0, total_credit: 0, total_quantity: 0 };

        return (
          <motion.div
            className="card shadow-lg border-0 rounded-3 mb-4"
            key={`${day?.date || "day"}-${idx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="card-body">
              <h5 className="fw-bold mb-3" style={{ color }}>
                {day?.date}
              </h5>

              <div className="table-responsive">
                <table className="table table-hover align-middle text-center">
                  <thead className="table-dark">
                    <tr>
                      <th>Seq No</th>
                      <th>Category</th>
                      <th>Subcategory</th>
                      <th>Amount</th>
                      <th>Type</th>
                      {/* NEW: Qty column before Purpose */}
                      <th>Qty</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayTxns.map((t) => (
                      <tr key={`${t.seq_no}-${t.category}-${t.subcategory}-${t.purpose}`}>
                        <td>{t.seq_no}</td>
                        <td>{t.category}</td>
                        <td>{t.subcategory || "-"}</td>
                        <td className="fw-bold">{inr.format(Number(t.amount || 0))}</td>
                        <td>
                          <span
                            className={`badge ${
                              t.type === "debit" ? "bg-danger" : "bg-success"
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        {/* Quantity value (fallback 0) */}
                        <td>{t.quantity ?? 0}</td>
                        <td>{t.purpose || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="row text-center mt-3">
                <div className="col-md-3 mb-2">
                  <div className="p-3 bg-light rounded shadow-sm">
                    <strong>Total Transactions</strong>
                    <div className="fw-bold">{sum.total_transactions}</div>
                  </div>
                </div>
                <div className="col-md-3 mb-2">
                  <div className="p-3 bg-light rounded shadow-sm">
                    <strong>Total Debit</strong>
                    <div className="text-danger fw-bold">
                      {inr.format(Number(sum.total_debit || 0))}
                    </div>
                  </div>
                </div>
                <div className="col-md-3 mb-2">
                  <div className="p-3 bg-light rounded shadow-sm">
                    <strong>Total Credit</strong>
                    <div className="text-success fw-bold">
                      {inr.format(Number(sum.total_credit || 0))}
                    </div>
                  </div>
                </div>
                {/* NEW: Total Quantity card */}
                <div className="col-md-3 mb-2">
                  <div className="p-3 bg-light rounded shadow-sm">
                    <strong>Total Quantity</strong>
                    <div className="fw-bold">
                      {Number(
                        sum.total_quantity ??
                          sum.totalQuantity ??
                          0
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Download & Email */}
      {transactionsByDate.length > 0 && (
        <div className="d-flex flex-wrap gap-3 mb-4">
          <button className="btn btn-success" onClick={handleDownloadPDF} disabled={loading}>
            Download PDF
          </button>
          <button
            className="btn btn-info text-white"
            onClick={openEmailModal}
            disabled={loading}
          >
            Send PDF via Email
          </button>
        </div>
      )}

      {/* Monthly Totals */}
      {monthlyTotals && (
        <div className="card shadow-lg border-0 rounded-3 p-3">
          <h5 className="fw-bold mb-3 text-center">Monthly Totals</h5>
          <div className="row text-center">
            <div className="col-md-3 mb-2">
              <div className="p-3 bg-light rounded shadow-sm">
                <strong>Total Transactions</strong>
                <div className="fw-bold">
                  {monthlyTotals.totalTransactions ??
                    monthlyTotals.total_transactions ??
                    0}
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="p-3 bg-light rounded shadow-sm">
                <strong>Total Debit</strong>
                <div className="text-danger fw-bold">
                  {inr.format(
                    Number(monthlyTotals.totalDebit ?? monthlyTotals.total_debit ?? 0)
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="p-3 bg-light rounded shadow-sm">
                <strong>Total Credit</strong>
                <div className="text-success fw-bold">
                  {inr.format(
                    Number(monthlyTotals.totalCredit ?? monthlyTotals.total_credit ?? 0)
                  )}
                </div>
              </div>
            </div>
            {/* NEW: Monthly total quantity */}
            <div className="col-md-3 mb-2">
              <div className="p-3 bg-light rounded shadow-sm">
                <strong>Total Quantity</strong>
                <div className="fw-bold">
                  {Number(
                    monthlyTotals.totalQuantity ??
                      monthlyTotals.total_quantity ??
                      0
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal (Download or Email) */}
      <CenterModal
        show={!!downloadSuccess}
        title="Success"
        onClose={() => setDownloadSuccess(null)}
        size="sm"
        footer={
          <button className="btn btn-primary" onClick={() => setDownloadSuccess(null)}>
            OK
          </button>
        }
      >
        <div className="text-center">
          <div
            className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
            style={{
              width: 60,
              height: 60,
              background: "#e6f4ea",
              color: "#198754",
              fontSize: 28,
            }}
          >
            ✓
          </div>
          <p className="mb-0">
            {downloadSuccess?.filename?.endsWith(".pdf")
              ? `Your file "${downloadSuccess.filename}" has been downloaded.`
              : downloadSuccess?.filename}
          </p>
        </div>
      </CenterModal>

      {/* Error Modal */}
      <CenterModal
        show={!!errorMsg}
        title="Oops!"
        onClose={() => setErrorMsg(null)}
        size="sm"
        footer={
          <button className="btn btn-secondary" onClick={() => setErrorMsg(null)}>
            Close
          </button>
        }
      >
        <div className="text-center">
          <div
            className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
            style={{
              width: 60,
              height: 60,
              background: "#fdecea",
              color: "#dc3545",
              fontSize: 28,
            }}
          >
            !
          </div>
          <p className="mb-0">{errorMsg}</p>
        </div>
      </CenterModal>

      {/* Email Modal */}
      <CenterModal
        show={emailModalOpen}
        title="Send PDF via Email"
        onClose={() => setEmailModalOpen(false)}
        size="md"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setEmailModalOpen(false)}
              disabled={emailSending}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={sendEmail}
              disabled={emailSending}
            >
              {emailSending ? "Sending..." : "Send"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">Recipient Email</label>
          <input
            type="email"
            className={`form-control ${emailError ? "is-invalid" : ""}`}
            placeholder="name@example.com"
            value={emailValue}
            onChange={(e) => {
              setEmailValue(e.target.value);
              setEmailError("");
            }}
          />
          {emailError && <div className="invalid-feedback">{emailError}</div>}
        </div>
        <p className="text-muted mb-0">
          We’ll send the current month’s category-wise PDF based on your selection.
        </p>
      </CenterModal>
    </div>
  );
};

export default TransactionCategorywise;
