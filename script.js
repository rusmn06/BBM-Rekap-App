document.addEventListener("DOMContentLoaded", () => {
  const monthSelect = document.getElementById("monthSelect");
  const mainFormCard = document.getElementById("mainFormCard");
  const generateCard = document.getElementById("generateCard");
  const inputId = document.getElementById("inputId");
  const btnSearch = document.getElementById("btnSearch");
  const menuType = document.getElementById("menuType");
  const inputSection = document.getElementById("inputSection");
  const unconditionalSection = document.getElementById("unconditionalSection");
  const tanggalRev = document.getElementById("tanggalRev");
  const kmRev = document.getElementById("kmRev");
  const hargaRev = document.getElementById("hargaRev");
  const keteranganInput = document.getElementById("keteranganInput");
  const statusApprov = document.getElementById("statusApprov");
  const btnSave = document.getElementById("btnSave");
  const saveMessage = document.getElementById("saveMessage");
  const btnGenerate = document.getElementById("btnGenerate");
  const resultText = document.getElementById("resultText");
  const btnCopy = document.getElementById("btnCopy");
  const resultWrapper = document.getElementById("resultWrapper");
  const loader = document.getElementById("loader");

  // Template elements
  const btnToggleTemplate = document.getElementById("btnToggleTemplate");
  const templateSection = document.getElementById("templateSection");
  const templateInput = document.getElementById("templateInput");
  const templateUnconditional = document.getElementById(
    "templateUnconditional",
  );
  const btnSaveTemplate = document.getElementById("btnSaveTemplate");
  const btnResetTemplate = document.getElementById("btnResetTemplate");
  const templateMessage = document.getElementById("templateMessage");

  const API_URL = APP_CONFIG.apiUrl;

  // Default templates
  const DEFAULT_TEMPLATE_INPUT =
    "{id} >> {tanggal}, KM menjadi {km}, harga menjadi {harga}";
  const DEFAULT_TEMPLATE_UNCONDITIONAL = "{id} >> {status}";
  const STORAGE_KEY_INPUT = "bbm_template_input";
  const STORAGE_KEY_UNCONDITIONAL = "bbm_template_unconditional";

  const tipeBadge = document.getElementById("tipeBadge");

  // Load saved templates
  function loadTemplates() {
    templateInput.value =
      localStorage.getItem(STORAGE_KEY_INPUT) || DEFAULT_TEMPLATE_INPUT;
    templateUnconditional.value =
      localStorage.getItem(STORAGE_KEY_UNCONDITIONAL) ||
      DEFAULT_TEMPLATE_UNCONDITIONAL;
  }

  loadTemplates();

  // Toggle template section
  btnToggleTemplate.addEventListener("click", () => {
    const isHidden = templateSection.style.display === "none";
    templateSection.style.display = isHidden ? "block" : "none";
    btnToggleTemplate.classList.toggle("open", isHidden);
  });

  // Save template
  btnSaveTemplate.addEventListener("click", () => {
    localStorage.setItem(
      STORAGE_KEY_INPUT,
      templateInput.value.trim() || DEFAULT_TEMPLATE_INPUT,
    );
    localStorage.setItem(
      STORAGE_KEY_UNCONDITIONAL,
      templateUnconditional.value.trim() || DEFAULT_TEMPLATE_UNCONDITIONAL,
    );
    showTemplateMessage("Template berhasil disimpan!", true);
  });

  // Reset template
  btnResetTemplate.addEventListener("click", () => {
    templateInput.value = DEFAULT_TEMPLATE_INPUT;
    templateUnconditional.value = DEFAULT_TEMPLATE_UNCONDITIONAL;
    localStorage.removeItem(STORAGE_KEY_INPUT);
    localStorage.removeItem(STORAGE_KEY_UNCONDITIONAL);
    showTemplateMessage("Template direset ke default.", true);
  });

  // Apply template with data
  function applyTemplate(template, data) {
    return template
      .replace("{id}", data.id || "")
      .replace("{tanggal}", data.tanggal || "")
      .replace("{km}", data.km || "")
      .replace("{harga}", data.harga || "")
      .replace("{status}", data.status || "");
  }

  // format tanggal dari Google Sheets (ISO) ke format text
  function formatTanggal(val) {
    if (!val) return "";
    // Deteksi format ISO dari Google Sheets (misal: 2025-09-03T16:00:00.000Z)
    const d = new Date(val);
    if (!isNaN(d.getTime()) && String(val).includes("T")) {
      const bulan = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];
      return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
    }
    // Kalau sudah string biasa, kembalikan apa adanya
    return String(val).trim();
  }

  // Auto-load sheets
  async function loadSheets() {
    showLoader();
    try {
      const response = await fetch(`${API_URL}?action=getSheets`);
      const data = await response.json();
      if (data.status === "success") {
        monthSelect.innerHTML = '<option value="">-- Pilih Bulan --</option>';
        data.data.forEach((sheet) => {
          const option = document.createElement("option");
          option.value = sheet;
          option.textContent = sheet;
          monthSelect.appendChild(option);
        });
      } else {
        alert("Gagal memuat sheet: " + data.message);
      }
    } catch (error) {
      alert("Gagal terhubung ke API. Periksa config.js.");
      console.error(error);
    } finally {
      hideLoader();
    }
  }

  loadSheets();

  // Handle Month Selection
  monthSelect.addEventListener("change", () => {
    if (monthSelect.value) {
      mainFormCard.style.display = "block";
      generateCard.style.display = "block";
      resetForm();
    } else {
      mainFormCard.style.display = "none";
      generateCard.style.display = "none";
    }
  });

  // Handle Menu Type change
  menuType.addEventListener("change", async () => {
    inputSection.style.display = "none";
    unconditionalSection.style.display = "none";
    tipeBadge.style.display = "none";

    const val = menuType.value;

    if (val === "input") {
      inputSection.style.display = "block";
      tipeBadge.style.display = "inline-flex";
      tipeBadge.className = "tipe-badge input";
      tipeBadge.textContent = "🧾 Menu Input";
    } else if (val === "unconditional") {
      unconditionalSection.style.display = "block";
      tipeBadge.style.display = "inline-flex";
      tipeBadge.className = "tipe-badge uncond";
      tipeBadge.textContent = "✅ Unconditional";
    } else if (val === "noitem") {
      tipeBadge.style.display = "inline-flex";
      tipeBadge.className = "tipe-badge noitem";
      tipeBadge.textContent = "⚠️ No Item";

      // Pastikan ID sudah diisi dan sudah dicari
      const sheet = monthSelect.value;
      const id = inputId.value.trim();
      if (!id || btnSave.disabled) {
        showMessage(
          "❌ Cari ID terlebih dahulu sebelum memilih No Item.",
          false,
          true,
        );
        menuType.value = "";
        tipeBadge.style.display = "none";
        return;
      }

      // Auto-save langsung
      showLoader();
      showMessage("", false);
      try {
        const payload = {
          action: "save",
          sheetName: sheet,
          id: id,
          tipe: "unconditional",
          tanggal: "",
          km: "",
          harga: "",
          keterangan: "",
          status: "No Item",
        };

        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (result.status === "success") {
          showMessage("⚠️ No Item berhasil disimpan!", true);
          resetForm();
        } else {
          showMessage(result.message, false, true);
          menuType.value = "";
          tipeBadge.style.display = "none";
        }
      } catch (error) {
        console.error(error);
        showMessage("Gagal menyimpan No Item.", false, true);
        menuType.value = "";
        tipeBadge.style.display = "none";
      } finally {
        hideLoader();
      }
    }
  });

  // Search ID
  btnSearch.addEventListener("click", async () => {
    const sheet = monthSelect.value;
    const id = inputId.value.trim();

    if (!id) {
      alert("Masukkan ID terlebih dahulu!");
      return;
    }

    showLoader();
    showMessage("", false);
    btnSave.disabled = true;

    try {
      const response = await fetch(
        `${API_URL}?action=search&sheetName=${encodeURIComponent(sheet)}&id=${encodeURIComponent(id)}`,
      );
      const result = await response.json();

      if (result.status === "success" && result.data) {
        const d = result.data;
        menuType.value = d.tipe || "";
        menuType.dispatchEvent(new Event("change"));

        if (d.tipe === "input") {
          tanggalRev.value = d.tanggal || "";
          kmRev.value = d.km || "";
          hargaRev.value = d.harga || "";
          keteranganInput.value = d.keterangan || "";
        } else if (d.tipe === "unconditional") {
          statusApprov.value = d.status || "";
        }

        btnSave.disabled = false;
        showMessage("✅ ID ditemukan! Silakan edit jika perlu.", true);
      } else {
        resetFormFields();
        menuType.value = "";
        menuType.dispatchEvent(new Event("change"));
        btnSave.disabled = true;
        showMessage(
          "❌ ID tidak ditemukan di sheet. Pastikan ID sudah ada di spreadsheet.",
          false,
          true,
        );
      }
    } catch (error) {
      console.error(error);
      btnSave.disabled = true;
      showMessage(
        "❌ Gagal terhubung ke server. Periksa koneksi atau config.js.",
        false,
        true,
      );
    } finally {
      hideLoader();
    }
  });

  // Save Record
  btnSave.addEventListener("click", async () => {
    const sheet = monthSelect.value;
    const id = inputId.value.trim();
    const type = menuType.value;

    if (!id || !type) {
      showMessage("ID dan Tipe Pengecekan wajib diisi!", false, true);
      return;
    }

    const payload = {
      action: "save",
      sheetName: sheet,
      id: id,
      tipe: type,
      tanggal: "",
      km: "",
      harga: "",
      keterangan: "",
      status: "",
    };

    if (type === "input") {
      payload.tanggal = tanggalRev.value.trim();
      payload.km = kmRev.value.trim();
      payload.harga = hargaRev.value.trim();
      payload.keterangan = keteranganInput.value.trim();
    } else if (type === "unconditional") {
      payload.status = statusApprov.value;
      if (!payload.status) {
        showMessage(
          "Pilih Status Saat Ini untuk menu unconditional!",
          false,
          true,
        );
        return;
      }
    }

    showLoader();
    const MAX_RETRY = 3;
    let attempt = 0;
    let lastError = "";

    while (attempt < MAX_RETRY) {
      attempt++;
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (result.status === "success") {
          // Verifikasi: pastikan data benar-benar tersimpan di sheet
          const verify = await fetch(
            `${API_URL}?action=search&sheetName=${encodeURIComponent(sheet)}&id=${encodeURIComponent(id)}`,
          );
          const verifyResult = await verify.json();

          if (verifyResult.status === "success" && verifyResult.data) {
            // Data confirmed tersimpan
            showMessage(`Data berhasil disimpan dan terverifikasi!`, true);
            hideLoader();
            resetForm();
            return;
          } else {
            // GAS bilang sukses tapi data tidak ada — retry
            lastError = "Verifikasi gagal, mencoba ulang...";
            showMessage(
              `Percobaan ${attempt}/${MAX_RETRY}: ${lastError}`,
              false,
            );
            await new Promise((r) => setTimeout(r, 1500)); // tunggu 1.5 detik sebelum retry
            continue;
          }
        } else {
          lastError = result.message;
          showMessage(
            `Percobaan ${attempt}/${MAX_RETRY} gagal: ${lastError}`,
            false,
          );
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (error) {
        lastError = "Koneksi gagal";
        console.error(`Attempt ${attempt}:`, error);
        showMessage(
          `Percobaan ${attempt}/${MAX_RETRY}: koneksi gagal`,
          false,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Semua retry habis
    hideLoader();
    showMessage(
      `Gagal menyimpan setelah ${MAX_RETRY} percobaan. Coba lagi manual.`,
      false,
      true,
    );
  });

  // Generate Message
  btnGenerate.addEventListener("click", async () => {
    const sheet = monthSelect.value;
    const tmplInput = templateInput.value.trim() || DEFAULT_TEMPLATE_INPUT;
    const tmplUnconditional =
      templateUnconditional.value.trim() || DEFAULT_TEMPLATE_UNCONDITIONAL;

    showLoader();
    resultText.value = "";
    btnCopy.style.display = "none";
    resultWrapper.style.display = "none"; // sembunyikan dulu

    try {
      const response = await fetch(
        `${API_URL}?action=getAll&sheetName=${encodeURIComponent(sheet)}`,
      );
      const result = await response.json();

      if (result.status === "success") {
        const records = result.data;
        let generatedMessage = "";

        records.forEach((r) => {
          if (r.tipe === "input") {
            // Build dinamis — hanya sertakan field yang benar-benar ada isinya
            const tanggal = formatTanggal(r.tanggal);
            const km = r.km ? String(r.km).trim() : "";
            const harga = r.harga ? String(r.harga).trim() : "";

            const parts = [];
            if (tanggal) parts.push(`tanggal ${tanggal}`);
            if (km) parts.push(`KM menjadi ${km}`);
            if (harga) parts.push(`harga menjadi ${harga}`);

            if (parts.length > 0) {
              generatedMessage += `${r.id} » ${parts.join(", ")}\n`;
            }
          } else if (r.tipe === "unconditional") {
            if (r.status) {
              generatedMessage += applyTemplate(tmplUnconditional, r) + "\n";
            }
          }
        });

        resultWrapper.style.display = "block"; // tampilkan wrapper dulu
        if (generatedMessage.trim() === "") {
          resultText.value =
            "Tidak ada data yang perlu direkap untuk bulan ini.";
          btnCopy.style.display = "none";
        } else {
          resultText.value = generatedMessage.trim();
          btnCopy.style.display = "block";
        }
      } else {
        alert("Gagal mengambil data: " + result.message);
      }
    } catch (error) {
      console.error(error);
      alert("Gagal men-generate pesan.");
    } finally {
      hideLoader();
    }
  });

  // Copy to clipboard
  btnCopy.addEventListener("click", () => {
    resultText.select();
    resultText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    const originalText = btnCopy.textContent;
    btnCopy.textContent = "Berhasil di-copy!";
    setTimeout(() => {
      btnCopy.textContent = originalText;
    }, 2000);
  });

  // Helper functions
  function showLoader() {
    loader.style.display = "flex";
  }
  function hideLoader() {
    loader.style.display = "none";
  }

  function resetFormFields() {
    tanggalRev.value = "";
    kmRev.value = "";
    hargaRev.value = "";
    keteranganInput.value = "";
    statusApprov.value = "";
  }

  function resetForm() {
    inputId.value = "";
    menuType.value = "";
    inputSection.style.display = "none";
    unconditionalSection.style.display = "none";
    tipeBadge.style.display = "none"; // ← tambah ini
    resetFormFields();
    btnSave.disabled = true;
    setTimeout(() => {
      showMessage("", false);
    }, 3000);
  }

  function showMessage(msg, isSuccess, isError = false) {
    if (!msg) {
      saveMessage.style.display = "none";
      saveMessage.className = "app-message";
      return;
    }
    saveMessage.style.display = "flex"; // flex agar icon & teks sejajar
    saveMessage.textContent = msg;
    saveMessage.className =
      "app-message " + (isError ? "error" : isSuccess ? "success" : "");
  }

  function showTemplateMessage(msg, isSuccess) {
    templateMessage.style.display = "flex";
    templateMessage.textContent = msg;
    templateMessage.className =
      "app-message " + (isSuccess ? "success" : "error");
    setTimeout(() => {
      templateMessage.style.display = "none";
      templateMessage.className = "app-message";
    }, 3000);
  }
});
