const form = document.getElementById("form");

function setError(id, pesan) {
  document.getElementById("err-" + id).textContent = pesan;
  document.getElementById(id).classList.toggle("invalid", pesan !== "");
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  let valid = true;

  if (form.username.value.trim() === "") { setError("username", "Username wajib diisi"); valid = false; }
  else setError("username", "");

  if (form.password.value === "") { setError("password", "Password wajib diisi"); valid = false; }
  else setError("password", "");

  if (valid) {
    // ganti dengan halaman tujuan setelah login (atau kirim ke server dulu)
    window.location.href = "index.html";
  }
});

// hapus pesan error saat pengguna mulai mengetik lagi
form.querySelectorAll("input").forEach(function (input) {
  input.addEventListener("input", function () { setError(input.id, ""); });
});