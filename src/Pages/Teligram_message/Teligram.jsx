import React, { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";

const API_URL =
  import.meta.env.VITE_API_URL || "https://express-backend-myapp.onrender.com";

const PUBLIC_USER_ID = 7;

const dateBadgeThemes = [
  ["#0f766e", "#14b8a6"],
  ["#2563eb", "#38bdf8"],
  ["#7c3aed", "#c084fc"],
  ["#be123c", "#fb7185"],
  ["#b45309", "#f59e0b"],
  ["#047857", "#34d399"],
  ["#4338ca", "#818cf8"],
  ["#c2410c", "#fb923c"],
];

const ATTACH_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAZCAYAAAA14t7uAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFBSURBVEhL7ZXRjcMgDIb/3jsreAFYIQuwQhcoI3QBughdJOki9iL/PVyDUkKb9HT31k+KItnwScHYOZAkdpJSgpkBAEQE5/MZItIuAwB8tYEeZoYQAq7XaxVN04QQAqZpapf/wB3EGOm95ziO3biqPsRJclOsqnTOsZTSpl7mNo9i/tRhGNoURAQigtvt1qb6Z2xmtUg9XuVmVuK5UM+KcrlckFJqwytW4i3MDKrahle8Ld7LR1xZidveX7bw8j1jZqs96Ilxl82XfhgGiAhSSgghwMxwPB6BxX3uibstnXOmc67OAFVlzpmn0+lhXrTrlnTFJOm9fzpgSLKUQuccc85tinwlzjnTe1+HzDiOVFWWUhhjpHOOMcZ2W+WpmPcjmCXt05toSw7c8QeZ29jMajG32CX+Dd3r9hd8xJV/E38DUIkWAOcCAi0AAAAASUVORK5CYII=";
const COLOR_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABNCAYAAAAW92IAAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAmXSURBVHhe7Zt7bFtXHcc/516/4rzatE2faZsm7Tro0nbtKlqJbmyjwMY0YKCNSYwWsa1jEi0rGitSYSAGQ9NYmViReFQTgghRJNCE9ui6MbEKja0s7dag9UnX9LGkrZM0jh3Hvvfwx7lJ7JNr+9pOmiHnI0W2f+c+zvme3/mdZ4SUUlLGGLqh3JgUQDeUG5MC6IZyY1IA3VBuTAqgG8qNSQF0Q7kxKYBuKDfKXgAxcdPhoddK52u+bAgQzufQ7zFgYgSQKUichYGTEHsPom0QPwEDHZC6DHYMRADMEJiVEJwDwUaoaIKqFgjOh1Aj+Gr0JxfMFRRAghWH7r1w5mmIHwMrCjLpeIF0vCA9O2m1LVAtVphghMCsgboNMO9bEFoAwleUV4y/ANKCwU7o/D1c+BPEjioPwNavLBxhKk+ZcgPU3wnTbgWzqiAhxlEACfYARPbC0Qcg1ZO30BKBJX1ctmoYkBUIbMJGjCqjD1NY+uVpCCVG9RpYsgsqmtVvD0KMkwASBrvg2FbofhHsuH6BK3G7gp9feJjne2+nMzUbn0gyP3CKe6c9w+dq92CI3AKCAP80mPtNmLcFjEBeEcZBAFu5+XsbIfpO3lofIiGDPNG5g2cv3YdEIJ2MCySmsHh8zhZur/1zHk/A8QYDZt8LjY+pIJqDsR0HSBsGTkP7HQUVHqAttpo/RDZhYwwXnuFmYfKbS98galdn3OOOVHHn/G/hyNfAiukXZDCGAkgYOA6HPw/xkwUVHqB9oIWk9OtmcER4f7CRmB3Wk7Ijk3DpRTjzpBIkC2MngJ2Ak9shdsTDoGY0SenPqHkdS/qQhWZXDsLpn0LPq8o7XSjwidmQcGYnRF7OqHnVqwvstL9s0jQFj2dt3wLJTN95QsJbMB3BaQ6nfgBWn54IYyOAhP7/qMGNHMxIidghWuPN3N+znjsjn2Rb71r2JebRL30Z1wGsq/wHKysO6GZwBLi19q/UmL16kgekGmn2vObqBaX3AtKGk9+Bc7uG25p0Cr+j7zrOWZXDNS8AE5ubgmfZHG7HJ0ZeLRFcSk3nwY7dtMVXY0kfAolfDPKVut08VP8TgsbAiA9JSA6GOLr/E5x8ay3JRIh5yw7RsuE5glVRRNqzAQg3w7UH1CgyjRIFkGoM37YOUn3DbV8iaI03syfehOXSroPCYntVG6v8FzLsEkHMDvPP/vWcSCwhIBIsCx1iRfhtAiIxcp0URC/N4PXf3U/nsaVI21QCC0n19C7Wb9pFfeMxhJFW40YQWl6GmjUjtpIFkCk49Sh0/Cyj7dsI7utdT5cVdm3zAskK/yV+WP2WnuQJK+nn77/ewulDq5FytMCh6l7uePTbhKovjxiFCYufgVkb0y8tMQZYMeh+dbjm0+m1Ay5WhUQQsYO62TOJWCVdJ5e4Fh4g0V/NmfYVmUZpq9GpRmkCpHrUrM6lqPOMfhfnVxhIGs202ikQO+UjEa3SzcNIKejvrtOtrkGweAGkDX1vqimthkByS+g0ZpbBUEhY3B0+pps9Y5g2vuBITNARQhKo0EeAQsUBjeIFwIKLz7nWvgDWBT7gpuBZgsIajtwGkrBI8dWKI9QbA/ptnvFXxKhrOAV6pHfwBweYfVV7plEYEJiWaStJAGlD3xu6dZhKkWJzuJ3tVW2s9F+kwezj+uA5dtbu51OhDlTcLg5fIMF1X2glWBlVkd4RQgiJLzjA2rt3UzvzvHaXqVaSNIrvBQY74c2r1fLVRCAFkTPzOfzKLZxtX05qMEh90xE+evPzzLmqHcPURpVGGNa0Q2B2hrl4AaLvwMGPqznARCGdxpXWGwgh3ZvGtNvgI60gMidcxTcBO+qs400gQiKERBj28J9r4YUfGh52VokyKUGAhGsA/PAhoOZjULnUtbijLV6x80RxG4hL6JXQI6FfgnWlNRNgVMCCHWC4rwwVHwO696nFD5nUU1QhD1qw34KIVGLUCFhmwI0+cF/3GHuMICz4PjRszVrX7lYvGCGnx9ewncL/JQWdEpJqyEC3VILsS0FKv2kcMIJQ/2WY+0DOYmZPyYdvKggXARJOQd0GgRL4lwUdboljiPDDvK3QvFM1gRwUL0Bglhpc6Ayi3D4bFnA+R3pJCAg2wOKnYf72UXN/N4oXwKyG0OiRFdLDeqj7ylcJCLU1VtkCLS/AzHs8FZ6SBBAG1H1at6oAV+PSNIYQwPQc6cUgfDDnQWj5m9pAdenvs1GCACbUfWb0I0JOtM9WxvkCmrIlFoOhdoEW/Rj8090Dcw6KFwAB4aVOLEh7qYHq6taZMLRhKxz7QgF3+cFfWCZzYtaogCeMggtPSeMAUHt+7V+C7ldGj3BSqGh/XqrvM5ya9w9tdY8RldfAyv2uc30vlOABqK3pabc56mv4gEZDecJ6E642IJCv8EJ1Yb5a5c6+WmfykuOm+CnXRRmvlOYBAKleOLACBj8Y7QUFIVRzWrgDqq5VvYzVB9GD8P5jkDjj/nzhg6XPwowv6imecKm6AjGrYfbXC4q8rlStUq48ayNULYeKRepz5j2w/CXl6m7ZlSmIvJBz/y8XLk8sECGg/i7wTdFTvCMCsOhHEJztZGkocjpb3aGF0PxU9q3uyN6iF2ZKFwABFY1qP16M3vLyRPUKNWXNmh0Dqleps0Bu8SDV4wTiwsn2xgIxYP4jKpNuGcxH7Q35xTNCOZ4voV9bBPXIGAmA6oYaHslfEDfcyuSKSxAcxvNDMhg7AUAdW1vw3VHrbnnped05OZYDOwF9B7KIICDUoBs9MbYCCEMdUKrbUNij+/4Nl9/IUjiUPfq2On7jdo0wnBhSOAXk0gsCzDAs/qUSwWvXKJPw3+9B7Njo7kxa0H8Yjm/Lft6nYrHrmr8XxlgAlAiBGeq8XuU1HmOChOgBaLseOlshcQ6SXWrw09UK735WHXJwnWcbMPVmj+8ZTekjwVwkL8KJbXBhj+vGZFZ8U9SJT6tPjTRzYVTCytecgVLhjK8ASOW2HU/AuV9BKqJfUBpGEJqehFmbvDc3jXEWACWCTEH0EBzdrE6H54v4XhCmGnwtetyZCRbXDV4BAYaQkOyGrj+qg9P97zpCFPp6Qx2Tb3hI9TglFJ4rK8AQNtiDEHkJOh5XXZsVVWJImSbI0GfanMCoVBOkJb+AULP7NLxAJkCANGQKBk6ps8X9B1UziR+HZEQFP+GDwFy1rTX1Rqharb7nWeouhIkVADJrXKb/Tif932WKd3c3PgQCTCylN6L/cyYF0A3lxqQAuqHcmBRAN5QbkwLohnLjfxwKZOw/FXKqAAAAAElFTkSuQmCC";


export default function Teligram() {
  const editorRef = useRef(null);
  const imageRef = useRef(null);
  const colorRef = useRef(null);
  const bottomRef = useRef(null);
  const savedRangeRef = useRef(null);
  const verifiedPinRef = useRef("");
  const unlockCheckingRef = useRef(false);
  const unlockRequestIdRef = useRef(0);
  const channelLoadIdRef = useRef(0);
  const notesRequestIdRef = useRef(0);

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [notes, setNotes] = useState([]);

  const [channelUnlocked, setChannelUnlocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockChecking, setUnlockChecking] = useState(false);

  const [textColor, setTextColor] = useState("#111111");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [removeOldImage, setRemoveOldImage] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [composerMode, setComposerMode] = useState("message");
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    underline: false,
  });

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [confirmBox, setConfirmBox] = useState({
    show: false,
    title: "",
    message: "",
    action: null,
  });

  useEffect(() => {
    loadSelectedChannel();
  }, []);

  useEffect(() => {
    if (
      selectedChannel?.channel_id &&
      (!isTrue(selectedChannel.is_private) || channelUnlocked)
    ) {
      fetchNotes(selectedChannel.channel_id, verifiedPinRef.current || getSavedChannelPin());
    }
  }, [selectedChannel, channelUnlocked]);

  useEffect(() => {
    if (!isTrue(selectedChannel?.is_private) || channelUnlocked) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [notes, selectedChannel, channelUnlocked]);

  const isTrue = (value) => {
    return value === true || value === "true" || value === 1 || value === "1";
  };

  const parseDateValue = (dateValue) => {
    if (!dateValue) return null;

    if (dateValue instanceof Date) {
      return Number.isNaN(dateValue.getTime()) ? null : dateValue;
    }

    let value = String(dateValue).trim();
    if (!value) return null;

    value = value.replace(" ", "T");

    const hasTimeZone =
      value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);

    if (!hasTimeZone && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      value = `${value}Z`;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getIndiaDateKey = (dateValue) => {
    const date = parseDateValue(dateValue);
    if (!date) return "unknown";

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const formatIndiaDateOnly = (dateValue) => {
    const date = parseDateValue(dateValue);
    if (!date) return "";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatIndiaTimeOnly = (dateValue) => {
    const date = parseDateValue(dateValue);
    if (!date) return "";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(date)
      .replace("am", "AM")
      .replace("pm", "PM");
  };

  const getSavedChannelPin = () => {
    return localStorage.getItem("selected_channel_pin") || "";
  };

  const getAccessHeaders = (channelOverride = selectedChannel, pinOverride = "") => {
    const headers = {};
    const savedPin = pinOverride || verifiedPinRef.current || getSavedChannelPin();

    if (isTrue(channelOverride?.is_private) && savedPin) {
      headers["x-channel-pin"] = savedPin;
    }

    return headers;
  };

  const getJsonHeaders = (channelOverride = selectedChannel, pinOverride = "") => {
    return {
      "Content-Type": "application/json",
      ...getAccessHeaders(channelOverride, pinOverride),
    };
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });

    setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 1800);
  };

  const openConfirm = (title, message, action) => {
    setConfirmBox({ show: true, title, message, action });
  };

  const closeConfirm = () => {
    setConfirmBox({ show: false, title: "", message: "", action: null });
  };

  const getInitial = (name) => {
    return name?.trim()?.charAt(0)?.toUpperCase() || "N";
  };

  const getFileUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("blob:")) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/uploads")) return `${API_URL}${url}`;
    return url;
  };

  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
  };


  const isTitleNote = (note) => {
    return String(note?.title || "").trim().toLowerCase() === "title";
  };

  const hasNoteImage = (note) => {
    return Boolean(note?.image_url || note?.image_path);
  };

  const hasNoteText = (note) => {
    return Boolean(stripHtml(note?.content_html || "").trim());
  };

  const getComposerTitleValue = (oldNote) => {
    if (composerMode === "title") return "title";
    if (oldNote && isTitleNote(oldNote)) return "title";
    return "";
  };

  const getEditorHtml = () => {
    const html = editorRef.current?.innerHTML || "";
    const text = editorRef.current?.textContent?.trim() || "";

    if (!text && (html === "<br>" || html === "<div><br></div>")) {
      return "";
    }

    return html.trim();
  };

  const loadSelectedChannel = async () => {
    const loadId = ++channelLoadIdRef.current;
    const channelId = localStorage.getItem("selected_channel_id");

    if (!channelId) {
      window.location.hash = "/teligram-channels";
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/telegram-channels/${channelId}`);
      const data = await res.json();

      if (loadId !== channelLoadIdRef.current) return;

      if (!res.ok) {
        showToast("Channel not found", "error");

        setTimeout(() => {
          window.location.hash = "/teligram-channels";
        }, 900);

        return;
      }

      const channel = data.channel;
      setSelectedChannel(channel);

      if (isTrue(channel.is_private)) {
        const savedPin = getSavedChannelPin();

        if (savedPin && /^[0-9]{4}$/.test(savedPin)) {
          const verified = await verifyPinFromApi(channel.channel_id, savedPin);

          if (loadId !== channelLoadIdRef.current) return;

          if (verified) {
            verifiedPinRef.current = savedPin;
            setChannelUnlocked(true);
            setUnlockPin("");
            setUnlockError("");
            return;
          }
        }

        verifiedPinRef.current = "";
        localStorage.removeItem("selected_channel_pin");
        setChannelUnlocked(false);
        setUnlockPin("");
        setUnlockError("");
        setNotes([]);
        return;
      }

      verifiedPinRef.current = "";
      localStorage.removeItem("selected_channel_pin");
      setChannelUnlocked(true);
      setUnlockPin("");
      setUnlockError("");
    } catch (error) {
      if (loadId !== channelLoadIdRef.current) return;
      console.error("Channel load error:", error);
      showToast("Server error while opening channel", "error");
    }
  };

  const verifyPinFromApi = async (channelId, pin) => {
    try {
      const res = await fetch(
        `${API_URL}/api/telegram-channels/${channelId}/verify-pin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        }
      );

      const data = await res.json();
      return res.ok && data.unlocked;
    } catch (error) {
      console.error("Verify PIN API error:", error);
      return false;
    }
  };

  const verifyPrivateChannelPin = async () => {
    if (!selectedChannel || unlockCheckingRef.current) return;

    const pin = unlockPin.replace(/\D/g, "").slice(0, 4);

    if (!/^[0-9]{4}$/.test(pin)) {
      setUnlockError("Enter valid 4 digit PIN");
      return;
    }

    const requestId = ++unlockRequestIdRef.current;
    unlockCheckingRef.current = true;

    try {
      setUnlockChecking(true);
      setUnlockError("");

      const verified = await verifyPinFromApi(selectedChannel.channel_id, pin);

      if (requestId !== unlockRequestIdRef.current) return;

      if (!verified) {
        verifiedPinRef.current = "";
        localStorage.removeItem("selected_channel_pin");
        setUnlockError("Wrong PIN");
        return;
      }

      verifiedPinRef.current = pin;
      localStorage.setItem("selected_channel_pin", pin);
      localStorage.setItem("selected_channel_is_private", "true");

      setUnlockError("");
      setUnlockPin("");
      setChannelUnlocked(true);

      fetchNotes(selectedChannel.channel_id, pin);
    } catch (error) {
      if (requestId !== unlockRequestIdRef.current) return;
      console.error("Unlock error:", error);
      setUnlockError("Server error");
    } finally {
      if (requestId === unlockRequestIdRef.current) {
        unlockCheckingRef.current = false;
        setUnlockChecking(false);
      }
    }
  };

  const fetchNotes = async (channelId, pinOverride = "") => {
    const requestId = ++notesRequestIdRef.current;
    const pinForRequest = pinOverride || verifiedPinRef.current || getSavedChannelPin();
    const channelForHeaders = selectedChannel || {
      channel_id: channelId,
      is_private: localStorage.getItem("selected_channel_is_private") === "true",
    };

    try {
      const res = await fetch(
        `${API_URL}/api/telegram-notes?user_id=${PUBLIC_USER_ID}&channel_id=${channelId}`,
        { headers: getAccessHeaders(channelForHeaders, pinForRequest) }
      );

      const data = await res.json();

      if (requestId !== notesRequestIdRef.current) return;

      if (!res.ok) {
        if (res.status === 403 && isTrue(channelForHeaders?.is_private)) {
          const stillValid =
            pinForRequest && (await verifyPinFromApi(channelId, pinForRequest));

          if (requestId !== notesRequestIdRef.current) return;

          if (stillValid) {
            verifiedPinRef.current = pinForRequest;
            localStorage.setItem("selected_channel_pin", pinForRequest);
            setChannelUnlocked(true);
            showToast(data.message || "Unable to load messages", "error");
            return;
          }

          verifiedPinRef.current = "";
          localStorage.removeItem("selected_channel_pin");
          setChannelUnlocked(false);
          setNotes([]);
          setUnlockError("");
          return;
        }

        showToast(data.message || "Unable to load messages", "error");
        return;
      }

      const allNotes = data.notes || [];

      const channelNotes = allNotes
        .filter((note) => {
          if (note.channel_id === null || note.channel_id === undefined) {
            return true;
          }

          return Number(note.channel_id) === Number(channelId);
        })
        .map((note) => ({
          ...note,
          channel_id: note.channel_id || channelId,
        }));

      setNotes(channelNotes);
    } catch (error) {
      if (requestId !== notesRequestIdRef.current) return;
      console.error("Fetch notes error:", error);
      showToast("Unable to load messages", "error");
    }
  };

  const filteredNotes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return notes;

    const words = q.split(/\s+/).filter(Boolean);

    return notes.filter((note) => {
      const plainText = stripHtml(note.content_html || "").toLowerCase();
      const imageText = note.image_url || note.image_path ? " image photo picture" : "";
      const searchable = `${plainText}${imageText}`;
      return words.every((word) => searchable.includes(word));
    });
  }, [notes, searchText]);

  const groupedNotes = useMemo(() => {
    const sorted = [...filteredNotes].sort((a, b) => {
      const aTime = parseDateValue(a.created_at || a.updated_at)?.getTime() || 0;
      const bTime = parseDateValue(b.created_at || b.updated_at)?.getTime() || 0;
      return aTime - bTime;
    });

    let lastDateKey = "";
    let badgeIndex = -1;

    return sorted.map((note) => {
      const messageDate = note.created_at || note.updated_at;
      const dateKey = getIndiaDateKey(messageDate);
      const showDateBadge = dateKey !== lastDateKey;

      if (showDateBadge) {
        badgeIndex += 1;
        lastDateKey = dateKey;
      }

      const [badgeColor1, badgeColor2] =
        dateBadgeThemes[badgeIndex % dateBadgeThemes.length];

      return {
        note,
        messageDate,
        showDateBadge,
        dateLabel: formatIndiaDateOnly(messageDate),
        badgeColor1,
        badgeColor2,
      };
    });
  }, [filteredNotes]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (
      editorRef.current &&
      editorRef.current.contains(range.commonAncestorContainer)
    ) {
      savedRangeRef.current = range.cloneRange();
      updateActiveFormats();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return false;

    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
    return true;
  };


  const updateActiveFormats = () => {
    try {
      setActiveFormats({
        bold: Boolean(document.queryCommandState("bold")),
        underline: Boolean(document.queryCommandState("underline")),
      });
    } catch (error) {
      setActiveFormats({ bold: false, underline: false });
    }
  };

  const applySelectedFormat = (type, value = null) => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    restoreSelection();

    try {
      if (type === "bold") {
        document.execCommand("bold", false, null);
      }

      if (type === "underline") {
        document.execCommand("underline", false, null);
      }

      if (type === "color") {
        setTextColor(value);
        document.execCommand("foreColor", false, value);
      }
    } catch (error) {
      console.error("Format apply error:", error);
    }

    saveSelection();

    setTimeout(() => {
      updateActiveFormats();
    }, 0);
  };

  const applyBold = (e) => {
    e.preventDefault();
    applySelectedFormat("bold");
  };

  const applyUnderline = (e) => {
    e.preventDefault();
    applySelectedFormat("underline");
  };

  const openColorPicker = (e) => {
    e.preventDefault();
    saveSelection();
    colorRef.current?.click();
  };

  const changeColor = (color) => {
    applySelectedFormat("color", color);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select only image", "error");
      return;
    }

    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
    setRemoveOldImage(false);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewImage("");
    setRemoveOldImage(true);

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const resetForm = () => {
    setTextColor("#111111");
    setSelectedImage(null);
    setPreviewImage("");
    setRemoveOldImage(false);
    setEditingNoteId(null);
    setComposerMode("message");
    setActiveFormats({ bold: false, underline: false });
    setActiveMenuId(null);
    savedRangeRef.current = null;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    try {
      if (document.queryCommandState("bold")) {
        document.execCommand("bold", false, null);
      }

      if (document.queryCommandState("underline")) {
        document.execCommand("underline", false, null);
      }

      document.execCommand("foreColor", false, "#111111");
    } catch (error) {
      // Browser can ignore command state reset when the editor is not focused.
    }

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const saveNote = async () => {
    if (!selectedChannel?.channel_id) {
      showToast("Please open channel first", "error");
      return;
    }

    const contentHtml = getEditorHtml();
    const plainText = stripHtml(contentHtml).trim();

    if (!plainText && !selectedImage && !previewImage) {
      showToast("Please add text or image", "error");
      return;
    }

    const currentImageFile = selectedImage;
    const currentPreviewImage = previewImage;
    const currentRemoveImage = removeOldImage;
    const currentTextColor = textColor;
    const oldEditingId = editingNoteId;
    const oldNotes = notes;
    const now = new Date().toISOString();
    const tempId = oldEditingId || `temp-${Date.now()}`;

    const oldNote = oldEditingId
      ? notes.find((note) => String(note.note_id) === String(oldEditingId))
      : null;

    const noteTitle = getComposerTitleValue(oldNote);

    const optimisticNote = {
      note_id: tempId,
      user_id: PUBLIC_USER_ID,
      channel_id: selectedChannel.channel_id,
      title: noteTitle,
      content_html: contentHtml,
      text_color: currentTextColor,
      image_url: currentRemoveImage ? null : currentPreviewImage || null,
      image_path: null,
      created_at: oldEditingId ? oldNote?.created_at || now : now,
      updated_at: now,
      is_temp: true,
    };

    if (oldEditingId) {
      setNotes((prev) =>
        prev.map((note) =>
          String(note.note_id) === String(oldEditingId)
            ? { ...note, ...optimisticNote }
            : note
        )
      );
    } else {
      setNotes((prev) => [...prev, optimisticNote]);
    }

    resetForm();

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("title", noteTitle);
      formData.append("content_html", contentHtml);
      formData.append("text_color", currentTextColor);
      formData.append("remove_image", currentRemoveImage ? "true" : "false");

      if (currentImageFile) {
        formData.append("image", currentImageFile);
      }

      const url = oldEditingId
        ? `${API_URL}/api/telegram-notes/${oldEditingId}`
        : `${API_URL}/api/telegram-notes`;

      const method = oldEditingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAccessHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Action failed", "error");
        setNotes(oldNotes);

        if (res.status === 403) {
          setChannelUnlocked(false);
          localStorage.removeItem("selected_channel_pin");
        }

        return;
      }

      const backendNote = data.note || {};

      const savedNote = {
        ...optimisticNote,
        ...backendNote,
        channel_id: backendNote.channel_id || selectedChannel.channel_id,
        title: backendNote.title !== undefined ? backendNote.title : noteTitle,
        text_color: backendNote.text_color || currentTextColor,
        content_html: backendNote.content_html || contentHtml,
        image_url:
          backendNote.image_url ||
          backendNote.image_path ||
          optimisticNote.image_url ||
          null,
        created_at: backendNote.created_at || optimisticNote.created_at,
        updated_at: backendNote.updated_at || new Date().toISOString(),
        is_temp: false,
      };

      if (oldEditingId) {
        setNotes((prev) =>
          prev.map((note) =>
            String(note.note_id) === String(oldEditingId) ? savedNote : note
          )
        );
      } else {
        setNotes((prev) =>
          prev.map((note) =>
            String(note.note_id) === String(tempId) ? savedNote : note
          )
        );
      }

      fetch(
        `${API_URL}/api/telegram-channels/${selectedChannel.channel_id}/last-message`,
        {
          method: "PATCH",
          headers: getJsonHeaders(),
          body: JSON.stringify({
            last_message: noteTitle === "title"
              ? `Title: ${plainText.slice(0, 70)}`
              : plainText.slice(0, 80) || "Image message",
          }),
        }
      );

      showToast(oldEditingId ? "Message updated" : "Message sent", "success");
    } catch (error) {
      console.error("Save note error:", error);
      showToast("Server error", "error");
      setNotes(oldNotes);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode(isTitleNote(note) ? "title" : hasNoteImage(note) ? "image-caption" : "message");
    setTextColor(note.text_color || "#111111");
    setPreviewImage(getFileUrl(note.image_url || note.image_path || ""));
    setSelectedImage(null);
    setRemoveOldImage(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = note.content_html || "";
    }

    setTimeout(() => {
      editorRef.current?.focus();
      saveSelection();
    }, 100);
  };

  const startImageUpdate = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("image-update");
    setTextColor(note.text_color || "#111111");
    setPreviewImage(getFileUrl(note.image_url || note.image_path || ""));
    setSelectedImage(null);
    setRemoveOldImage(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = note.content_html || "";
    }

    setTimeout(() => {
      imageRef.current?.click();
    }, 80);
  };

  const startImageCaption = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("image-caption");
    setTextColor(note.text_color || "#111111");
    setPreviewImage(getFileUrl(note.image_url || note.image_path || ""));
    setSelectedImage(null);
    setRemoveOldImage(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = note.content_html || "";
    }

    setTimeout(() => {
      editorRef.current?.focus();
      saveSelection();
    }, 100);
  };

  const markNoteAsTitle = async (note) => {
    if (note.is_temp || hasNoteImage(note)) return;

    const oldNotes = notes;
    setActiveMenuId(null);
    setNotes((prev) =>
      prev.map((item) =>
        String(item.note_id) === String(note.note_id)
          ? { ...item, title: "title", updated_at: new Date().toISOString() }
          : item
      )
    );

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("title", "title");
      formData.append("content_html", note.content_html || "");
      formData.append("text_color", note.text_color || "#111111");
      formData.append("remove_image", "false");

      const res = await fetch(`${API_URL}/api/telegram-notes/${note.note_id}`, {
        method: "PUT",
        headers: getAccessHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setNotes(oldNotes);
        showToast(data.message || "Title update failed", "error");
        return;
      }

      const backendNote = data.note || {};

      setNotes((prev) =>
        prev.map((item) =>
          String(item.note_id) === String(note.note_id)
            ? { ...item, ...backendNote, title: "title" }
            : item
        )
      );

      showToast("Title style added", "success");
    } catch (error) {
      console.error("Title update error:", error);
      setNotes(oldNotes);
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId) => {
    const oldNotes = notes;

    setNotes((prev) =>
      prev.filter((note) => String(note.note_id) !== String(noteId))
    );

    setActiveMenuId(null);

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/telegram-notes/${noteId}`, {
        method: "DELETE",
        headers: getAccessHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Delete failed", "error");
        setNotes(oldNotes);

        if (res.status === 403) {
          setChannelUnlocked(false);
          localStorage.removeItem("selected_channel_pin");
        }

        return;
      }

      showToast("Message deleted", "success");
    } catch (error) {
      console.error("Delete note error:", error);
      showToast("Server error while deleting", "error");
      setNotes(oldNotes);
    } finally {
      setLoading(false);
    }
  };

  const backToChannels = () => {
    resetForm();
    window.location.hash = "/teligram-channels";
  };

  const privateChannelLocked =
    selectedChannel && isTrue(selectedChannel.is_private) && !channelUnlocked;

  return (
    <div className="nm-screen">
      <div className="nm-phone">
        <header className="nm-header">
          <button className="header-icon-btn back-btn" onClick={backToChannels}>
            ‹
          </button>

          <div className="header-logo">
            {selectedChannel?.logo_url ? (
              <img src={getFileUrl(selectedChannel.logo_url)} alt="logo" />
            ) : (
              <span>{getInitial(selectedChannel?.channel_name)}</span>
            )}
          </div>

          <div className="header-title">
            <h2>{selectedChannel?.channel_name || "Notes"}</h2>
            {selectedChannel?.channel_tagline && (
              <p>{selectedChannel.channel_tagline}</p>
            )}
          </div>

          {!privateChannelLocked && (
            <button
              className={`header-icon-btn search-btn ${searchOpen ? "active" : ""}`}
              onClick={() => {
                setSearchOpen(!searchOpen);
                setSearchText("");
              }}
              title="Search"
            >
              🔍
            </button>
          )}
        </header>

        {privateChannelLocked ? (
          <main className="unlock-screen">
            <div className="unlock-card">
              <div className="unlock-logo">
                {selectedChannel?.logo_url ? (
                  <img src={getFileUrl(selectedChannel.logo_url)} alt="logo" />
                ) : (
                  <span>{getInitial(selectedChannel?.channel_name)}</span>
                )}
              </div>

              <div className="unlock-lock">🔐</div>

              <h3>Private Channel</h3>

              <p>
                Enter 4 digit PIN to open <b>{selectedChannel?.channel_name}</b>
              </p>

              {selectedChannel?.channel_tagline && (
                <div className="unlock-tagline">
                  {selectedChannel.channel_tagline}
                </div>
              )}

              <input
                className="center-pin-input"
                type="text"
                inputMode="numeric"
                maxLength="4"
                placeholder="0000"
                value={unlockPin}
                autoFocus
                onChange={(e) => {
                  setUnlockPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setUnlockError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    verifyPrivateChannelPin();
                  }
                }}
              />

              {unlockError && <div className="unlock-error">{unlockError}</div>}

              <button
                className="unlock-open-btn"
                onClick={verifyPrivateChannelPin}
                disabled={unlockChecking}
              >
                {unlockChecking ? "Checking..." : "Open Channel"}
              </button>

              <button className="unlock-back-btn" onClick={backToChannels}>
                Back
              </button>
            </div>
          </main>
        ) : (
          <>
            {searchOpen && (
              <div className="search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search every word..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchText("");
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <main className="chat-body" onClick={() => setActiveMenuId(null)}>
              {groupedNotes.length === 0 && (
                <div className="empty-card">
                  <div className="empty-icon">✦</div>
                  <h3>{searchText ? "No match found" : "No messages yet"}</h3>
                  <p>
                    {searchText
                      ? "Try another search word"
                      : "Start typing below"}
                  </p>
                </div>
              )}

              {groupedNotes.map(
                ({
                  note,
                  messageDate,
                  showDateBadge,
                  dateLabel,
                  badgeColor1,
                  badgeColor2,
                }) => {
                  const hasText = hasNoteText(note);
                  const hasImage = hasNoteImage(note);
                  const titleMessage = isTitleNote(note);

                  return (
                    <div className="note-block" key={note.note_id}>
                      {showDateBadge && (
                        <div className="date-separator">
                          <span
                            style={{
                              "--badge1": badgeColor1,
                              "--badge2": badgeColor2,
                            }}
                          >
                            {dateLabel}
                          </span>
                        </div>
                      )}

                      <div
                        className={`message-line ${
                          activeMenuId === note.note_id ? "message-active" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`message-bubble ${
                            hasImage && !hasText ? "image-only" : ""
                          } ${titleMessage ? "title-bubble" : ""}`}
                        >
                          <button
                            className="message-dot-btn"
                            onClick={() =>
                              setActiveMenuId(
                                activeMenuId === note.note_id
                                  ? null
                                  : note.note_id
                              )
                            }
                            title="Options"
                          >
                            ⋮
                          </button>

                          {hasImage && (
                            <div className={`image-message-wrap ${hasText ? "with-description" : ""}`}>
                              <img
                                src={getFileUrl(note.image_url || note.image_path)}
                                alt="note"
                                className="message-image"
                              />

                              {hasText && (
                                <div
                                  className="image-description-text"
                                  style={{ color: note.text_color || "#111111" }}
                                  dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(note.content_html),
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {hasText && !hasImage && (
                            <div
                              className={`message-text ${
                                titleMessage ? "message-title-text" : ""
                              }`}
                              style={{ color: note.text_color || "#111111" }}
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(note.content_html),
                              }}
                            />
                          )}

                          <div className="message-time">
                            <span>{formatIndiaTimeOnly(messageDate)}</span>
                            {note.is_temp && <span> sending</span>}
                          </div>
                        </div>

                        {activeMenuId === note.note_id && !note.is_temp && (
                          <div className="message-action-row">
                            {hasImage ? (
                              <>
                                <button
                                  className="square-action update-square"
                                  onClick={() => startImageUpdate(note)}
                                >
                                  Image
                                </button>

                                <button
                                  className="square-action text-square"
                                  onClick={() => startImageCaption(note)}
                                >
                                  {hasText ? "Text" : "Add Text"}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="square-action update-square"
                                  onClick={() => startEdit(note)}
                                >
                                  Update
                                </button>

                                <button
                                  className="square-action title-square"
                                  onClick={() => markNoteAsTitle(note)}
                                >
                                  Title
                                </button>
                              </>
                            )}

                            <button
                              className="square-action delete-square"
                              onClick={() =>
                                openConfirm(
                                  "Delete Message?",
                                  "This message will be deleted permanently.",
                                  () => deleteNote(note.note_id)
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              <div ref={bottomRef}></div>
            </main>

            {previewImage && (
              <div className="preview-strip">
                <img src={getFileUrl(previewImage)} alt="preview" />
                <span>{selectedImage ? selectedImage.name : composerMode === "image-update" ? "Current image - select new image" : "Current image"}</span>
                <button onClick={removeImage}>×</button>
              </div>
            )}

            {editingNoteId && (
              <div className="edit-strip">
                <span>{composerMode === "title" ? "Adding title style" : composerMode === "image-update" ? "Updating image" : composerMode === "image-caption" ? "Adding image text" : "Updating message"}</span>
                <button onClick={resetForm}>Cancel</button>
              </div>
            )}

            <footer className="composer">
              <div className="composer-card">
                <div className="composer-tools">
                  <div className="tool-left">
                    <button
                      className={`tool-btn format-btn ${activeFormats.bold ? "active" : ""}`}
                      onMouseDown={applyBold}
                      title="Bold"
                    >
                      <b>B</b>
                    </button>

                    <button
                      className={`tool-btn format-btn ${activeFormats.underline ? "active" : ""}`}
                      onMouseDown={applyUnderline}
                      title="Underline"
                    >
                      <u>U</u>
                    </button>

                    <input
                      ref={colorRef}
                      type="color"
                      value={textColor}
                      hidden
                      onChange={(e) => changeColor(e.target.value)}
                    />

                    <button
                      className={`tool-btn color-tool ${textColor !== "#111111" ? "active" : ""}`}
                      onMouseDown={openColorPicker}
                      title="Text color"
                      style={{ "--pickedColor": textColor }}
                    >
                      <img src={COLOR_ICON} alt="color" className="tool-icon color-icon" />
                    </button>

                    <input
                      ref={imageRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleImageSelect}
                    />

                    <button
                      className={`tool-btn image-tool ${previewImage ? "active" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => imageRef.current.click()}
                      title="Add image"
                    >
                      <img src={ATTACH_ICON} alt="image" className="tool-icon attach-icon" />
                    </button>
                  </div>

                  <button
                    className="send-btn"
                    onClick={saveNote}
                    disabled={loading}
                    title="Send"
                  >
                    {loading ? "…" : editingNoteId ? "✓" : "➤"}
                  </button>
                </div>

                <div
                  ref={editorRef}
                  className="text-input"
                  contentEditable
                  data-placeholder={composerMode === "title" ? "Type title..." : composerMode === "image-update" ? "Select new image, then tap send" : composerMode === "image-caption" ? "Add image description..." : "Type message..."}
                  style={{ color: textColor }}
                  onFocus={saveSelection}
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                  onKeyDown={() => {
                    setTimeout(updateActiveFormats, 0);
                  }}
                  onInput={saveSelection}
                  onBlur={saveSelection}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text/plain");
                    document.execCommand("insertText", false, text);
                    saveSelection();
                  }}
                ></div>
              </div>
            </footer>
          </>
        )}
      </div>

      {toast.show && (
        <div className="popup-layer">
          <div className={`toast ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" ? "✓" : "!"}
            </div>
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      {confirmBox.show && (
        <div className="confirm-layer">
          <div className="confirm-card">
            <div className="confirm-icon">?</div>
            <h3>{confirmBox.title}</h3>
            <p>{confirmBox.message}</p>

            <div className="confirm-actions">
              <button className="cancel-confirm" onClick={closeConfirm}>
                Cancel
              </button>

              <button
                className="delete-confirm"
                onClick={() => {
                  closeConfirm();
                  confirmBox.action && confirmBox.action();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        html,
        body,
        #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        body {
          background: #07111f;
        }

        .nm-screen {
          width: 100vw;
          min-height: 100dvh;
          display: flex;
          justify-content: center;
          align-items: stretch;
          background:
            radial-gradient(circle at 0% 0%, rgba(20, 184, 166, 0.32), transparent 32%),
            radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.25), transparent 34%),
            linear-gradient(145deg, #020617, #0f172a 48%, #0f766e);
          font-family: Inter, Arial, sans-serif;
          overflow: hidden;
        }

        .nm-phone {
          width: 100vw;
          max-width: 430px;
          height: 100dvh;
          background: #e9f3ef;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .nm-header {
          min-height: 70px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: max(9px, env(safe-area-inset-top)) 10px 10px;
          background:
            radial-gradient(circle at 92% 9%, rgba(255, 255, 255, 0.24), transparent 28%),
            linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.22);
          z-index: 30;
        }

        .header-icon-btn {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 12px;
          background: rgba(255,255,255,0.14);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        }

        .back-btn {
          font-size: 31px;
          line-height: 1;
          padding-bottom: 3px;
        }

        .search-btn {
          font-size: 15px;
        }

        .search-btn.active {
          background: rgba(255,255,255,0.26);
        }

        .header-logo {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, #14b8a6, #2563eb);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 900;
          flex-shrink: 0;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.2);
        }

        .header-logo img,
        .unlock-logo img,
        .preview-strip img,
        .message-image {
          display: block;
        }

        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-title {
          flex: 1;
          min-width: 0;
        }

        .header-title h2 {
          margin: 0;
          color: white;
          font-size: 17px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: 0.1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-title p {
          margin: 3px 0 0;
          color: rgba(255,255,255,0.86);
          font-size: 11px;
          line-height: 1.2;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-box {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(255,255,255,0.96);
          border-bottom: 1px solid rgba(226,232,240,0.95);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
          z-index: 24;
        }

        .search-box span {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #ecfeff;
          font-size: 13px;
          flex-shrink: 0;
        }

        .search-box input {
          flex: 1;
          min-width: 0;
          height: 38px;
          border: 1px solid #dbe4f0;
          border-radius: 16px;
          outline: none;
          padding: 0 13px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 14px;
          font-weight: 700;
        }

        .search-box input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
        }

        .search-box button {
          width: 31px;
          height: 31px;
          border: none;
          border-radius: 11px;
          background: #e2e8f0;
          color: #475569;
          font-size: 19px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
        }

        .chat-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 11px 9px 12px;
          background:
            radial-gradient(circle at 10% 8%, rgba(255,255,255,0.72), transparent 27%),
            radial-gradient(circle at 92% 92%, rgba(14,165,233,0.18), transparent 31%),
            linear-gradient(135deg, #e7f8ef, #f6fbff 48%, #e8efff);
          scroll-behavior: smooth;
        }

        .chat-body::-webkit-scrollbar {
          width: 4px;
        }

        .chat-body::-webkit-scrollbar-thumb {
          background: rgba(15, 118, 110, 0.34);
          border-radius: 999px;
        }

        .empty-card {
          width: fit-content;
          max-width: 82%;
          margin: 92px auto 0;
          padding: 19px 21px;
          border-radius: 24px;
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.72);
          box-shadow: 0 18px 45px rgba(15,23,42,0.11);
          text-align: center;
          backdrop-filter: blur(12px);
        }

        .empty-icon {
          width: 47px;
          height: 47px;
          margin: 0 auto 10px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 900;
        }

        .empty-card h3 {
          margin: 0 0 6px;
          color: #0f172a;
          font-size: 16px;
          font-weight: 900;
        }

        .empty-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .note-block {
          width: 100%;
        }

        .date-separator {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 9px 0 12px;
          width: 100%;
          pointer-events: none;
        }

        .date-separator span {
          min-height: 27px;
          max-width: calc(100vw - 40px);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 13px;
          border-radius: 999px;
          color: white;
          background: linear-gradient(135deg, var(--badge1), var(--badge2));
          font-size: 11.5px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 24px rgba(15,23,42,0.16);
          white-space: nowrap;
        }

        .message-line {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin: 0 0 8px;
          animation: msgIn 0.18s ease;
          position: relative;
        }

        .message-active {
          z-index: 10;
        }

        @keyframes msgIn {
          from {
            opacity: 0;
            transform: translateY(7px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .message-bubble {
          width: fit-content;
          max-width: min(82%, 342px);
          min-width: 54px;
          position: relative;
          padding: 7px 31px 18px 10px;
          border-radius: 7px 18px 18px 18px;
          background: rgba(255,255,255,0.98);
          border: 1px solid rgba(226,232,240,0.86);
          color: #0f172a;
          box-shadow: 0 7px 20px rgba(15,23,42,0.10);
          word-break: break-word;
          overflow-wrap: anywhere;
          backdrop-filter: blur(12px);
        }

        .message-bubble::before {
          content: "";
          position: absolute;
          left: -5px;
          top: -1px;
          width: 0;
          height: 0;
          border-top: 10px solid rgba(255,255,255,0.98);
          border-left: 8px solid transparent;
        }

        .message-bubble.image-only {
          padding: 5px 29px 18px 5px;
          min-width: 70px;
          max-width: min(84%, 312px);
        }

        .message-dot-btn {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 9px;
          background: rgba(241,245,249,0.9);
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          z-index: 3;
        }

        .message-dot-btn:hover,
        .message-dot-btn:focus {
          background: #e2e8f0;
          outline: none;
        }

        .message-text {
          max-width: 100%;
          padding-right: 2px;
          color: #111111;
          font-size: 15.5px;
          line-height: 1.42;
          font-weight: 650;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .message-text div,
        .message-text p {
          margin: 0;
        }

        .message-text strong,
        .message-text b {
          font-weight: 900;
        }

        .message-text u {
          text-underline-offset: 3px;
        }

        .message-image {
          width: auto;
          max-width: min(264px, 70vw);
          max-height: 310px;
          object-fit: contain;
          border-radius: 14px;
          border: 1px solid rgba(226,232,240,0.86);
          box-shadow: 0 6px 16px rgba(15,23,42,0.10);
          background: #f8fafc;
        }

        .message-time {
          position: absolute;
          right: 8px;
          bottom: 4px;
          display: flex;
          align-items: center;
          gap: 3px;
          color: #64748b;
          font-size: 9.8px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          user-select: none;
        }

        .message-action-row {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 6px;
          padding-left: 4px;
          max-width: 100%;
          flex-wrap: wrap;
          animation: actionsIn 0.15s ease;
        }

        @keyframes actionsIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .square-action {
          height: 34px;
          min-width: 86px;
          border: 1px solid transparent;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 22px rgba(15,23,42,0.10);
        }

        .update-square {
          color: #1d4ed8;
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .delete-square {
          color: #dc2626;
          background: #fff1f2;
          border-color: #fecdd3;
        }

        .preview-strip {
          flex-shrink: 0;
          z-index: 23;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 10px;
          background: rgba(255,255,255,0.98);
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -8px 22px rgba(15,23,42,0.06);
        }

        .preview-strip img {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid #dbe4f0;
          flex-shrink: 0;
        }

        .preview-strip span {
          flex: 1;
          min-width: 0;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preview-strip button {
          width: 29px;
          height: 29px;
          border: none;
          border-radius: 10px;
          background: #fee2e2;
          color: #dc2626;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
        }

        .edit-strip {
          flex-shrink: 0;
          z-index: 23;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 10px;
          background: #eff6ff;
          color: #2563eb;
          border-top: 1px solid #bfdbfe;
          font-size: 13px;
          font-weight: 900;
        }

        .edit-strip button {
          height: 31px;
          border: none;
          border-radius: 11px;
          padding: 0 12px;
          background: #2563eb;
          color: white;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .composer {
          flex-shrink: 0;
          z-index: 25;
          padding: 8px;
          padding-bottom: max(8px, env(safe-area-inset-bottom));
          background: rgba(255,255,255,0.98);
          border-top: 1px solid rgba(226,232,240,0.95);
          box-shadow: 0 -10px 28px rgba(15,23,42,0.09);
        }

        .composer-card {
          width: 100%;
          border: 1px solid #dbe4f0;
          border-radius: 20px;
          background: #f8fafc;
          padding: 6px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.92);
        }

        .composer-tools {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .tool-left {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .tool-btn {
          width: 31px;
          height: 31px;
          border: 1px solid #dbe4f0;
          border-radius: 11px;
          background: #ffffff;
          color: #334155;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(15,23,42,0.05);
        }

        .tool-btn:active,
        .send-btn:active,
        .square-action:active {
          transform: scale(0.98);
        }

        .color-tool {
          color: var(--pickedColor);
          border-bottom: 3px solid var(--pickedColor);
          font-family: Georgia, serif;
          font-size: 15px;
        }

        .send-btn {
          width: 41px;
          height: 34px;
          border: none;
          border-radius: 13px;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 8px 18px rgba(14,165,233,0.28);
        }

        .send-btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .text-input {
          width: 100%;
          min-height: 42px;
          max-height: 108px;
          overflow-y: auto;
          overflow-x: hidden;
          outline: none;
          border: 1px solid #dbe4f0;
          border-radius: 16px;
          background: white;
          color: #111111;
          padding: 10px 12px;
          font-size: 15px;
          line-height: 1.38;
          font-weight: 650;
          word-break: break-word;
          overflow-wrap: anywhere;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .text-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
        }

        .text-input:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          font-weight: 700;
        }

        .text-input::-webkit-scrollbar {
          width: 3px;
        }

        .text-input::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        .unlock-screen {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          background:
            radial-gradient(circle at top, rgba(14,165,233,0.24), transparent 36%),
            radial-gradient(circle at bottom right, rgba(20,184,166,0.20), transparent 32%),
            linear-gradient(135deg, #e2f8ed, #f4f8ff 48%, #e5ebff);
        }

        .unlock-card {
          width: 100%;
          max-width: 330px;
          padding: 26px 18px 18px;
          border-radius: 29px;
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(226,232,240,0.9);
          box-shadow: 0 28px 80px rgba(15,23,42,0.22);
          text-align: center;
          backdrop-filter: blur(18px);
          animation: unlockPop 0.22s ease;
        }

        @keyframes unlockPop {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .unlock-logo {
          width: 76px;
          height: 76px;
          margin: 0 auto 11px;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 900;
          box-shadow: 0 18px 35px rgba(14,165,233,0.28);
        }

        .unlock-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .unlock-lock {
          width: 46px;
          height: 46px;
          margin: -4px auto 11px;
          border-radius: 50%;
          background: #dbeafe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 10px 22px rgba(37,99,235,0.14);
        }

        .unlock-card h3 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          font-weight: 900;
        }

        .unlock-card p {
          margin: 9px 0 13px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.42;
          font-weight: 700;
        }

        .unlock-card p b {
          color: #0f766e;
        }

        .unlock-tagline {
          max-width: 250px;
          margin: 0 auto 13px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #ecfeff;
          color: #0f766e;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .center-pin-input {
          width: 154px;
          height: 52px;
          display: block;
          margin: 4px auto 10px;
          border: 1px solid #cbd5e1;
          border-radius: 17px;
          background: white;
          color: #0f172a;
          outline: none;
          text-align: center;
          font-size: 24px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 7px;
          padding-left: 7px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .center-pin-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.14);
        }

        .unlock-error {
          margin-bottom: 10px;
          color: #dc2626;
          font-size: 12px;
          font-weight: 900;
        }

        .unlock-open-btn {
          width: 100%;
          height: 44px;
          border: none;
          border-radius: 15px;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(14,165,233,0.28);
        }

        .unlock-open-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .unlock-back-btn {
          width: 100%;
          height: 38px;
          margin-top: 8px;
          border: none;
          border-radius: 14px;
          background: #f1f5f9;
          color: #475569;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .popup-layer {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .toast {
          width: min(245px, calc(100vw - 40px));
          padding: 20px 16px;
          border-radius: 24px;
          background: white;
          box-shadow: 0 24px 80px rgba(15,23,42,0.3);
          text-align: center;
          animation: popupScale 0.16s ease;
        }

        .toast-icon {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
          font-weight: 900;
        }

        .toast.success .toast-icon {
          background: #dcfce7;
          color: #16a34a;
        }

        .toast.error .toast-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .toast p {
          margin: 0;
          color: #1f2937;
          font-size: 14px;
          font-weight: 900;
        }

        .confirm-layer {
          position: fixed;
          inset: 0;
          z-index: 110;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15,23,42,0.52);
          backdrop-filter: blur(6px);
        }

        .confirm-card {
          width: 100%;
          max-width: 330px;
          padding: 23px 18px 18px;
          border-radius: 26px;
          background: white;
          box-shadow: 0 28px 90px rgba(15,23,42,0.38);
          text-align: center;
          animation: popupScale 0.16s ease;
        }

        @keyframes popupScale {
          from {
            transform: scale(0.92);
            opacity: 0;
          }

          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .confirm-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #fee2e2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          font-size: 26px;
          font-weight: 900;
        }

        .confirm-card h3 {
          margin: 0;
          color: #111827;
          font-size: 20px;
        }

        .confirm-card p {
          margin: 9px 0 18px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.4;
        }

        .confirm-actions {
          display: flex;
          gap: 10px;
        }

        .confirm-actions button {
          flex: 1;
          height: 42px;
          border: none;
          border-radius: 15px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .cancel-confirm {
          background: #f1f5f9;
          color: #475569;
        }

        .delete-confirm {
          background: #dc2626;
          color: white;
        }



        .message-bubble {
          max-width: min(96%, 398px);
          padding: 7px 30px 18px 10px;
        }

        .message-bubble.image-only {
          max-width: min(96%, 392px);
        }

        .title-bubble {
          background: linear-gradient(135deg, #fff7ed, #ffffff 58%, #f0f9ff);
          border-color: #fed7aa;
          box-shadow: 0 10px 26px rgba(249, 115, 22, 0.12);
        }

        .message-title-text {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 20px;
          line-height: 1.28;
          font-weight: 900;
          letter-spacing: 0.15px;
          color: #0f172a !important;
          padding-right: 2px;
        }

        .message-title-text::before {
          content: "Title";
          display: inline-flex;
          vertical-align: middle;
          margin: 0 7px 4px 0;
          padding: 3px 7px;
          border-radius: 8px;
          background: #ffedd5;
          color: #ea580c;
          font-family: Inter, Arial, sans-serif;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .image-description-text {
          margin-top: 7px;
          padding: 8px 9px 2px;
          border-top: 1px solid #e2e8f0;
          font-size: 14.5px;
          line-height: 1.42;
          font-weight: 650;
          color: #334155;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .image-description-text::before {
          content: "Description";
          display: block;
          margin-bottom: 3px;
          color: #0f766e;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.45px;
          text-transform: uppercase;
        }

        .image-description-text div,
        .image-description-text p {
          margin: 0;
        }

        .message-image {
          max-width: min(330px, 86vw);
          max-height: 420px;
        }

        .message-action-row {
          gap: 5px;
          margin-top: 5px;
          padding-left: 2px;
          flex-wrap: nowrap;
          overflow-x: auto;
          max-width: 100%;
          scrollbar-width: none;
        }

        .message-action-row::-webkit-scrollbar {
          display: none;
        }

        .square-action {
          height: 27px;
          min-width: auto;
          border-radius: 8px;
          padding: 0 8px;
          font-size: 10.5px;
          line-height: 1;
          box-shadow: 0 5px 14px rgba(15,23,42,0.09);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .text-square {
          color: #0f766e;
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .title-square {
          color: #ea580c;
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .update-square:hover,
        .text-square:hover,
        .title-square:hover,
        .delete-square:hover {
          transform: translateY(-1px);
          filter: brightness(0.98);
        }

        .tool-btn {
          position: relative;
          transition: all 0.16s ease;
        }

        .tool-btn:hover,
        .tool-btn.active {
          background: #fff7ed;
          color: #f97316;
          border-color: #fdba74;
          box-shadow: 0 7px 18px rgba(249,115,22,0.16);
        }

        .format-btn {
          font-size: 14px;
        }

        .tool-icon {
          display: block;
          object-fit: contain;
          pointer-events: none;
        }

        .attach-icon {
          width: 16px;
          height: 18px;
        }

        .color-icon {
          width: 22px;
          height: 22px;
        }

        .color-tool {
          border-bottom: 1px solid #dbe4f0;
          overflow: hidden;
        }

        .color-tool::after {
          content: "";
          position: absolute;
          left: 7px;
          right: 7px;
          bottom: 3px;
          height: 3px;
          border-radius: 99px;
          background: var(--pickedColor);
        }

        .edit-strip span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }



        /* Final compact message view: almost no card, full visible text/image */
        .message-line {
          margin: 0 0 7px;
          align-items: flex-start;
        }

        .message-bubble {
          width: fit-content;
          max-width: min(97%, 405px);
          min-width: 42px;
          padding: 3px 27px 13px 5px;
          border-radius: 6px 13px 13px 13px;
          background: rgba(255,255,255,0.38);
          border: 1px solid rgba(255,255,255,0.42);
          box-shadow: none;
          backdrop-filter: none;
          overflow: visible;
        }

        .message-bubble::before {
          display: none;
        }

        .message-bubble.image-only,
        .message-bubble:has(.message-image) {
          max-width: min(97%, 405px);
          padding: 0 25px 13px 0;
          background: transparent;
          border-color: transparent;
          border-radius: 0;
        }

        .message-text {
          font-size: 15.5px;
          line-height: 1.42;
          font-weight: 650;
          padding: 2px 0 0;
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .message-image {
          width: auto;
          max-width: min(374px, 91vw);
          max-height: 58dvh;
          object-fit: contain;
          border-radius: 13px;
          border: none;
          box-shadow: none;
          background: transparent;
        }

        .image-description-text {
          margin-top: 0;
          width: fit-content;
          max-width: min(374px, 91vw);
          padding: 7px 10px 8px;
          border-top: none;
          border-radius: 0 0 13px 13px;
          background: rgba(255,255,255,0.58);
          color: #334155;
          font-size: 14.3px;
          line-height: 1.42;
          font-weight: 650;
          box-shadow: none;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .message-image + .image-description-text,
        .image-description-text {
          transform: translateY(-1px);
        }

        .image-description-text::before {
          content: "Description";
          display: block;
          margin-bottom: 3px;
          color: #0f766e;
          font-size: 8.8px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.45px;
          text-transform: uppercase;
        }

        .message-time {
          right: 5px;
          bottom: 2px;
          padding: 1px 3px;
          border-radius: 6px;
          background: rgba(255,255,255,0.55);
          color: #64748b;
          font-size: 9.4px;
        }

        .message-bubble:has(.message-image) .message-time {
          right: 0;
          bottom: 0;
          background: rgba(15,23,42,0.45);
          color: white;
          backdrop-filter: blur(6px);
        }

        .message-dot-btn {
          top: 0;
          right: 0;
          width: 22px;
          height: 22px;
          border-radius: 7px;
          background: rgba(255,255,255,0.56);
          color: #475569;
          font-size: 15px;
          box-shadow: none;
        }

        .message-bubble:has(.message-image) .message-dot-btn {
          background: rgba(15,23,42,0.38);
          color: white;
          backdrop-filter: blur(6px);
        }

        .title-bubble {
          max-width: min(97%, 405px);
          padding: 7px 27px 13px 10px;
          background: transparent;
          border: none;
          border-left: 4px solid #f97316;
          border-radius: 0 13px 13px 0;
          box-shadow: none;
        }

        .message-title-text {
          font-family: "Playfair Display", Georgia, "Times New Roman", serif;
          font-size: 21px;
          line-height: 1.22;
          font-weight: 900;
          letter-spacing: 0.1px;
          color: #111827 !important;
          padding: 0;
        }

        .message-title-text::before {
          content: "TITLE";
          display: block;
          width: fit-content;
          margin: 0 0 4px;
          padding: 3px 7px;
          border-radius: 6px;
          background: #fff7ed;
          color: #ea580c;
          font-family: Inter, Arial, sans-serif;
          font-size: 8.5px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.7px;
          text-transform: uppercase;
        }

        .message-action-row {
          gap: 4px;
          margin-top: 3px;
          padding-left: 1px;
          flex-wrap: nowrap;
          overflow-x: auto;
          max-width: 100%;
          scrollbar-width: none;
        }

        .message-action-row::-webkit-scrollbar {
          display: none;
        }

        .square-action {
          height: 24px;
          min-width: 54px;
          border-radius: 7px;
          padding: 0 7px;
          font-size: 9.5px;
          line-height: 1;
          box-shadow: none;
          flex-shrink: 0;
        }

        @media (max-width: 370px) {
          .message-bubble,
          .message-bubble.image-only,
          .message-bubble:has(.message-image),
          .title-bubble {
            max-width: 98%;
          }

          .message-image,
          .image-description-text {
            max-width: min(320px, 90vw);
          }

          .message-text {
            font-size: 15px;
          }

          .message-title-text {
            font-size: 19.5px;
          }
        }

        @media (min-width: 431px) {
          .nm-screen {
            align-items: center;
            padding: 18px;
          }

          .nm-phone {
            width: 430px;
            height: 92dvh;
            border-radius: 26px;
            box-shadow: 0 34px 100px rgba(0,0,0,0.42);
          }
        }

        @media (max-width: 370px) {
          .nm-header {
            gap: 7px;
            padding-left: 8px;
            padding-right: 8px;
          }

          .header-icon-btn {
            width: 31px;
            height: 31px;
            border-radius: 11px;
          }

          .back-btn {
            font-size: 28px;
          }

          .header-logo {
            width: 41px;
            height: 41px;
            border-radius: 14px;
          }

          .header-title h2 {
            font-size: 15.5px;
          }

          .header-title p {
            font-size: 10.5px;
          }

          .chat-body {
            padding-left: 7px;
            padding-right: 7px;
          }

          .message-bubble {
            max-width: 96%;
            padding-right: 30px;
          }

          .message-image {
            max-width: min(300px, 86vw);
          }

          .tool-btn {
            width: 29px;
            height: 29px;
            font-size: 12px;
          }

          .send-btn {
            width: 38px;
            height: 32px;
          }

          .tool-left {
            gap: 5px;
          }

          .composer {
            padding-left: 7px;
            padding-right: 7px;
          }

          .square-action {
            min-width: auto;
            height: 26px;
            font-size: 10px;
            padding: 0 7px;
          }

          .unlock-card {
            padding: 24px 16px 18px;
          }

          .center-pin-input {
            width: 145px;
            letter-spacing: 6px;
          }
        }

        /* Final correction: compact cards, tiny corner time, fixed bold behavior display, image caption equals image width */
        .note-block {
          margin-bottom: 2px;
        }

        .message-line {
          margin: 0 0 10px;
          padding-right: 3px;
        }

        .message-active {
          z-index: 30;
        }

        .message-bubble {
          width: fit-content;
          max-width: min(96%, 402px);
          min-width: 52px;
          padding: 5px 24px 15px 8px;
          border-radius: 6px 12px 12px 12px;
          background: rgba(255, 255, 255, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.46);
          box-shadow: none;
          color: #0f172a;
          overflow: visible;
          position: relative;
        }

        .message-bubble::before {
          display: none;
        }

        .message-bubble.image-only,
        .message-bubble:has(.image-message-wrap) {
          max-width: min(96%, 402px);
          padding: 0 24px 14px 0;
          background: transparent;
          border-color: transparent;
          border-radius: 0;
          min-width: 88px;
        }

        .message-text {
          max-width: 100%;
          padding: 1px 0 0;
          font-family: Inter, Arial, sans-serif;
          font-size: 15.6px;
          line-height: 1.43;
          font-weight: 500;
          letter-spacing: 0;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .message-text strong,
        .message-text b,
        .message-text span[style*="font-weight: bold"],
        .message-text span[style*="font-weight: 700"],
        .message-text span[style*="font-weight: 800"],
        .message-text span[style*="font-weight: 900"] {
          font-weight: 900 !important;
        }

        .message-text u {
          text-underline-offset: 3px;
        }

        .image-message-wrap {
          display: block;
          width: fit-content;
          max-width: min(372px, calc(100vw - 40px));
          overflow: visible;
        }

        .message-image {
          display: block;
          width: auto;
          max-width: 100%;
          max-height: 58dvh;
          object-fit: contain;
          border-radius: 13px;
          border: none;
          box-shadow: none;
          background: transparent;
        }

        .image-description-text {
          display: block;
          width: 100%;
          max-width: 100%;
          margin-top: 0;
          padding: 7px 9px 8px;
          border-radius: 0 0 13px 13px;
          border-top: 1px solid rgba(226, 232, 240, 0.72);
          background: rgba(255, 255, 255, 0.62);
          font-family: Inter, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.42;
          font-weight: 500;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .image-description-text::before {
          content: "Description";
          display: block;
          margin: 0 0 4px;
          color: #0f766e;
          font-size: 8.5px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.45px;
          text-transform: uppercase;
        }

        .image-description-text strong,
        .image-description-text b,
        .image-description-text span[style*="font-weight: bold"] {
          font-weight: 900 !important;
        }

        .message-time {
          position: absolute;
          right: 5px;
          bottom: 3px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 1px 3px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.56);
          color: #64748b;
          font-size: 7.8px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          pointer-events: none;
        }

        .message-bubble:has(.image-message-wrap) .message-time {
          right: 3px;
          bottom: 3px;
          background: rgba(15, 23, 42, 0.52);
          color: #ffffff;
          backdrop-filter: blur(6px);
        }

        .message-dot-btn {
          top: 0;
          right: 0;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.58);
          color: #475569;
          font-size: 14px;
          box-shadow: none;
        }

        .message-dot-btn:hover,
        .message-dot-btn:focus {
          background: #fff7ed;
          color: #f97316;
        }

        .message-bubble:has(.image-message-wrap) .message-dot-btn {
          background: rgba(15, 23, 42, 0.42);
          color: #ffffff;
          backdrop-filter: blur(6px);
        }

        .message-action-row {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          margin-bottom: 3px;
          padding-left: 2px;
          max-width: 100%;
          flex-wrap: nowrap;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .message-action-row::-webkit-scrollbar {
          display: none;
        }

        .square-action {
          height: 22px;
          min-width: 46px;
          padding: 0 6px;
          border-radius: 6px;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          box-shadow: none;
          flex-shrink: 0;
        }

        .title-bubble {
          max-width: min(94%, 392px);
          min-width: 78px;
          padding: 6px 24px 15px 10px;
          background: rgba(255, 247, 237, 0.48);
          border: 1px solid rgba(254, 215, 170, 0.62);
          border-left: 4px solid #f97316;
          border-radius: 0 12px 12px 0;
          box-shadow: none;
        }

        .message-title-text {
          font-family: "Palatino Linotype", "Book Antiqua", Cambria, Georgia, serif;
          font-size: 18.5px;
          line-height: 1.22;
          font-weight: 900;
          letter-spacing: 0.15px;
          color: #c2410c !important;
          padding: 0;
        }

        .message-title-text::before {
          content: "Title";
          display: block;
          width: fit-content;
          margin: 0 0 3px;
          padding: 2px 6px;
          border-radius: 6px;
          background: #ffedd5;
          color: #ea580c;
          font-family: Inter, Arial, sans-serif;
          font-size: 8px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.65px;
          text-transform: uppercase;
        }

        .tool-btn:hover,
        .tool-btn.active {
          background: #fff7ed;
          color: #f97316;
          border-color: #fdba74;
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.14);
        }

        @media (max-width: 370px) {
          .message-bubble,
          .message-bubble.image-only,
          .message-bubble:has(.image-message-wrap),
          .title-bubble {
            max-width: 97%;
          }

          .image-message-wrap {
            max-width: min(330px, calc(100vw - 34px));
          }

          .message-text {
            font-size: 15px;
          }

          .message-title-text {
            font-size: 17.5px;
          }

          .message-time {
            font-size: 7.4px;
          }
        }

      `}</style>
    </div>
  );
}
