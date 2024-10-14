 const  roundToNearestHalf = (value) => {
    // Parse the input if it's a string that can be converted to a number
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if the input is a valid number
    if (isNaN(numberValue)) {
      return value; // Return the original input if it's not a number
    }
  
    // Round up to the nearest 0.5
    const roundedValue = Math.ceil(numberValue * 2) / 2;
  
    // Return the same type as input
    return typeof value === 'string' ? roundedValue.toString() : roundedValue;
  }



  module.exports = { roundToNearestHalf };