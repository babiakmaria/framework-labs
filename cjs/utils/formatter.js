const formatName = (name) => {
  if (!name) return '';
  return name.trim().toUpperCase();
};

module.exports = {
  formatName
};