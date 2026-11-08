const form = document.getElementById("form");
const success = document.getElementById("success");

function setError(id, pesan) {
  document.getElementById("err-" + id).textContent = pesan;
  document.getElementById(id).classList.toggle("invalid", pesan !== "");
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  success.style.display = "none";

  const nama = form.nama.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const konfirmasi = form.konfirmasi.value;
  let valid = true;

  if (nama === "") { setError("nama", "Nama lengkap wajib diisi"); valid = false; }
  else setError("nama", "");

  if (email === "") { setError("email", "Email wajib diisi"); valid = false; }
  else if (!/^\S+@\S+\.\S+$/.test(email)) { setError("email", "Format email tidak valid"); valid = false; }
  else setError("email", "");

  if (password === "") { setError("password", "Kata sandi wajib diisi"); valid = false; }
  else if (password.length < 8) { setError("password", "Minimal 8 karakter"); valid = false; }
  else setError("password", "");

  if (konfirmasi === "") { setError("konfirmasi", "Ulangi kata sandi wajib diisi"); valid = false; }
  else if (konfirmasi !== password) { setError("konfirmasi", "Kata sandi tidak sama"); valid = false; }
  else setError("konfirmasi", "");

  if (valid) {
    success.style.display = "block";
    form.reset();
  }
});

// hapus pesan error saat pengguna mulai mengetik lagi
form.querySelectorAll("input").forEach(function (input) {
  input.addEventListener("input", function () { setError(input.id, ""); });
});