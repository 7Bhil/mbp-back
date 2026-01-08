exports.generateMembershipNumber = () => {
  const prefix = 'MPB-';
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const year = new Date().getFullYear();
  return `${prefix}${year}-${random}`;
};

exports.generateMemberId = () => {
  return 'MPB' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
};
