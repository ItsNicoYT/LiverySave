window.Store = (() => {
  let items = [];
  let errorHandler = null;

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function onError(fn) {
    errorHandler = fn;
  }

  function report(e) {
    if (errorHandler) errorHandler(e);
    else console.error(e);
  }

  function setItems(list) {
    items = Array.isArray(list) ? list.slice() : [];
  }

  function getAll() {
    return items.slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  function get(id) {
    return items.find((i) => i.id === id);
  }

  function add(entry) {
    const item = Object.assign({ id: uid(), createdAt: Date.now() }, entry);
    items.push(item);
    DB.saveLivery(item).catch(report);
    return item;
  }

  function update(id, patch) {
    const item = items.find((i) => i.id === id);
    if (!item) return null;
    Object.assign(item, patch);
    DB.updateLivery(item).catch(report);
    return item;
  }

  function remove(id) {
    items = items.filter((i) => i.id !== id);
    DB.deleteLivery(id).catch(report);
  }

  function count() {
    return items.length;
  }

  return { setItems, getAll, get, add, update, remove, count, onError };
})();