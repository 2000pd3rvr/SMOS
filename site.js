(function () {
  const details = document.querySelector(".nav-modules");
  if (!details) return;

  document.addEventListener("click", (event) => {
    if (!details.open) return;
    if (details.contains(event.target)) return;
    details.open = false;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") details.open = false;
  });
})();
