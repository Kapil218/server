import bcrypt from "bcrypt";

const hashValue = async (value) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(value, salt);
};

const compareValue = async (enteredValue, storedValue) => {
  return await bcrypt.compare(enteredValue, storedValue);
};

export { hashValue, compareValue };
