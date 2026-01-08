exports.validateRegistration = (req, res, next) => {
  const {
    nom,
    prenom,
    email,
    telephone,
    birthYear,
    password
  } = req.body;
  
  const errors = [];
  
  if (!nom || nom.trim().length < 2) {
    errors.push('Nom invalide (minimum 2 caractères)');
  }
  
  if (!prenom || prenom.trim().length < 2) {
    errors.push('Prénom invalide (minimum 2 caractères)');
  }
  
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Email invalide');
  }
  
  if (!telephone || telephone.trim().length < 8) {
    errors.push('Téléphone invalide');
  }
  
  if (!birthYear || isNaN(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear() - 16) {
    errors.push('Année de naissance invalide');
  }
  
  if (!password || password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation échouée',
      errors
    });
  }
  
  next();
};