export const handleValidation = (validatorFunc, ...args) => {
    const { error } = validatorFunc(...args); // Spread all args to validator
    if (!error) return null;
  
    const errors = error.details.reduce((acc, err) => {
      acc[err.path[0]] = err.message;
      return acc;
    }, {});
    return errors;
  };
  