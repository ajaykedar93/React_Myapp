// src/pages/ActFavorite.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Modal,
  Alert,
} from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "../Entertainment/LoadingSpiner.jsx"; // ✅ your custom spinner

/* ========= API ========= */
const API = "https://express-backend-myapp.onrender.com/api/act_favorite";

/* ========= Theme ========= */
const theme = {
  primary: "#06b6d4",
  secondary: "#22c55e",
  purple: "#a78bfa",
  border: "rgba(15,23,42,0.12)",
  bg: "linear-gradient(180deg,#ffffff 0%, #fcfffb 40%, #f6fbff 100%)",
  shadow: "0 12px 32px rgba(0,0,0,.08)",
};

/* ========= Styles ========= */
const styles = {
  formCard: {
    borderRadius: "18px",
    boxShadow: theme.shadow,
    border: `1px solid ${theme.border}`,
    background: "#fff",
  },
  formControl: {
    borderRadius: "10px",
    border: `1.5px solid ${theme.border}`,
    background: "#fff",
    transition: "0.25s ease",
  },
  button: {
    background: `linear-gradient(90deg,${theme.secondary},${theme.primary})`,
    border: "none",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: "16px",
    padding: "10px 24px",
    color: "#05212a",
    transition: "all .25s ease",
    boxShadow: "0 12px 28px -12px rgba(6,182,212,.45)",
  },
  imagePreview: {
    width: "90px",
    height: "90px",
    objectFit: "cover",
    borderRadius: "10px",
    marginTop: "6px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: 0.35 },
};

export default function ActFavorite() {
  const [countries, setCountries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ type: "", msg: "" });
  const [modalShow, setModalShow] = useState(false);
  const [newFavorite, setNewFavorite] = useState(null);

  const [formData, setFormData] = useState({
    country: "",
    favorite_actress_name: "",
    age: "",
    actress_dob: "",
    favorite_movie_series: "",
    profile_image: "",
    images: [],
    notes: "",
  });

  // Disable if required fields missing
  const disableSubmit = useMemo(
    () =>
      saving ||
      !formData.country ||
      !formData.favorite_actress_name.trim() ||
      !formData.favorite_movie_series.trim() ||
      !formData.profile_image,
    [saving, formData]
  );

  /* ========= Fetch Country List ========= */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/countries`);
        setCountries(res.data || []);
      } catch (e) {
        setToast({ type: "warning", msg: "Could not load countries." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ========= Handlers ========= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleProfileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setFormData((p) => ({ ...p, profile_image: b64 }));
  };

  const handleMultiImage = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const b64s = await Promise.all(files.map(fileToBase64));
    setFormData((p) => ({ ...p, images: [...p.images, ...b64s] }));
  };

  const removeImage = (idx) =>
    setFormData((p) => ({
      ...p,
      images: p.images.filter((_, i) => i !== idx),
    }));

  const resetForm = () =>
    setFormData({
      country: "",
      favorite_actress_name: "",
      age: "",
      actress_dob: "",
      favorite_movie_series: "",
      profile_image: "",
      images: [],
      notes: "",
    });

  /* ========= Submit ========= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        // API accepts country as id or exact name; we’re sending the name from the dropdown.
        // Age to number or null:
        age: formData.age ? Number(formData.age) : null,
      };

      const res = await axios.post(API, payload);
      const created = res.data;
      setNewFavorite(created);
      setModalShow(true);
      setToast({ type: "success", msg: "Favorite added successfully!" });
      resetForm();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Error saving favorite";
      setToast({ type: "danger", msg });
    } finally {
      setSaving(false);
    }
  };

  /* ========= UI ========= */
  if (loading) return <LoadingSpinner />;

  return (
    <Container fluid className="py-4" style={{ minHeight: "100vh", background: theme.bg }}>
      <motion.div
        className="px-3 py-4 mb-4 text-center"
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          boxShadow: theme.shadow,
          background: "#fff",
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2
          style={{
            fontWeight: 800,
            background: `linear-gradient(90deg,${theme.primary},${theme.secondary},${theme.purple})`,
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          🎬 Add Favorite Actress
        </h2>
        <p className="text-muted mb-0">
          Add your favorite actress with country, movie/series, and profile image.
        </p>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {toast.msg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mb-3"
          >
            <Container style={{ maxWidth: 1100 }}>
              <Alert
                variant={toast.type || "info"}
                onClose={() => setToast({ type: "", msg: "" })}
                dismissible
                style={{ borderRadius: 12, boxShadow: theme.shadow }}
              >
                {toast.msg}
              </Alert>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Form */}
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <motion.div {...fadeUp}>
            <Card className="p-4" style={styles.formCard}>
              <Form onSubmit={handleSubmit}>
                {/* Country */}
                <Form.Group className="mb-3">
                  <Form.Label>Country</Form.Label>
                  <Form.Select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    style={styles.formControl}
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.country_name}>
                        {c.country_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Actress Name */}
                <Form.Group className="mb-3">
                  <Form.Label>Actress Name</Form.Label>
                  <Form.Control
                    name="favorite_actress_name"
                    value={formData.favorite_actress_name}
                    onChange={handleChange}
                    placeholder="e.g., Emma Watson"
                    style={styles.formControl}
                    required
                  />
                </Form.Group>

                {/* Movie / Series */}
                <Form.Group className="mb-3">
                  <Form.Label>Favorite Movie / Series</Form.Label>
                  <Form.Control
                    name="favorite_movie_series"
                    value={formData.favorite_movie_series}
                    onChange={handleChange}
                    placeholder="e.g., Avengers"
                    style={styles.formControl}
                    required
                  />
                </Form.Group>

                {/* Age / DOB */}
                <Row>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Age (Optional)</Form.Label>
                      <Form.Control
                        name="age"
                        type="number"
                        min="1"
                        value={formData.age}
                        onChange={handleChange}
                        style={styles.formControl}
                        placeholder="e.g., 30"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth (Optional)</Form.Label>
                      <Form.Control
                        type="date"
                        name="actress_dob"
                        value={formData.actress_dob}
                        onChange={handleChange}
                        style={styles.formControl}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Profile */}
                <Form.Group className="mb-3">
                  <Form.Label>Profile Image</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleProfileChange}
                    style={styles.formControl}
                    required
                  />
                  {formData.profile_image && (
                    <img
                      src={formData.profile_image}
                      alt="Profile Preview"
                      style={styles.imagePreview}
                    />
                  )}
                </Form.Group>

                {/* Extra Images */}
                <Form.Group className="mb-3">
                  <Form.Label>Additional Images (Optional)</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultiImage}
                    style={styles.formControl}
                  />
                  <div className="d-flex flex-wrap mt-2 gap-2">
                    {formData.images.map((img, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img src={img} alt="preview" style={styles.imagePreview} />
                        <Button
                          size="sm"
                          variant="danger"
                          style={{ position: "absolute", top: 0, right: 0, borderRadius: "50%" }}
                          onClick={() => removeImage(i)}
                          aria-label={`Remove image ${i + 1}`}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </Form.Group>

                {/* Notes */}
                <Form.Group className="mb-3">
                  <Form.Label>Notes (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    style={styles.formControl}
                    placeholder="Add a short note about this actress..."
                  />
                </Form.Group>

                <div className="text-center mt-3">
                  <Button type="submit" disabled={disableSubmit} style={styles.button}>
                    {saving ? <LoadingSpinner /> : "🚀 Add Favorite"}
                  </Button>
                </div>
              </Form>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Modal */}
      <Modal show={modalShow} onHide={() => setModalShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>🎉 Favorite Added!</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {newFavorite && (
            <>
              {newFavorite.profile_image && (
                <img
                  src={newFavorite.profile_image}
                  alt="Profile"
                  style={{ width: 150, borderRadius: 12, marginBottom: 10 }}
                />
              )}
              <h5 className="mb-1">{newFavorite.favorite_actress_name}</h5>
              <div className="text-muted">{newFavorite.favorite_movie_series}</div>
              {newFavorite.country_name && (
                <div className="small mt-1">Country: {newFavorite.country_name}</div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="info" onClick={() => setModalShow(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
