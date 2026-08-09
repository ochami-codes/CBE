import {
  isValidKenyanPhone,
  normalizeKenyanPhone,
} from "./phone.js";

/* -------------------------
   Full Name Validation
------------------------- */

const validateFullName = (fullName) => {
  if (!fullName?.trim()) {
    return "Full name is required";
  }

  const value = fullName.trim();

  if (value.length < 2) {
    return "Name must be at least 2 characters";
  }

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(value)) {
    return "Name contains invalid characters";
  }

  return null;
};

/* -------------------------
   Date Validation
------------------------- */

const validateDate = (
  value,
  fieldName,
  allowFuture = false
) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return `Enter a valid ${fieldName}`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!allowFuture && date > today) {
    return `${fieldName} cannot be in the future`;
  }

  return null;
};

/* -------------------------
   Date of Birth Validation
------------------------- */

const validateDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth) {
    return "Date of birth is required";
  }

  const dateError = validateDate(
    dateOfBirth,
    "date of birth"
  );

  if (dateError) {
    return dateError;
  }

  const dob = new Date(dateOfBirth);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let age =
    today.getFullYear() -
    dob.getFullYear();

  const monthDifference =
    today.getMonth() -
    dob.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < dob.getDate()
    )
  ) {
    age--;
  }

  if (age > 120) {
    return "Enter a valid date of birth";
  }

  return null;
};

/* -------------------------
   Gender Validation
------------------------- */

const validateGender = (gender) => {
  if (!gender) {
    return "Please select your gender";
  }

  const validGenders = [
    "male",
    "female",
    "other",
    "prefer_not_to_say",
  ];

  if (
    !validGenders.includes(
      gender.trim().toLowerCase()
    )
  ) {
    return "Please select a valid gender";
  }

  return null;
};

/* -------------------------
   Baptism Status Validation
------------------------- */

const validateBaptized = (baptized) => {
  if (!baptized?.trim()) {
    return "Please select baptism status";
  }

  const validValues = [
    "unknown",
    "baptized",
    "not_baptized",
  ];

  if (!validValues.includes(baptized.trim().toLowerCase())) {
    return "Please select a valid baptism status";
  }

  return null;
};

/* -------------------------
   Individual Field Validation
------------------------- */

export const validateMemberField = (
  field,
  value
) => {
  switch (field) {
    /* REQUIRED */

    case "full_name":
      return validateFullName(value);

    case "phone":
      if (!value?.trim()) {
        return "Phone number is required";
      }

      if (!isValidKenyanPhone(value)) {
        return "Please enter a valid Kenyan phone number";
      }

      return null;

    case "date_of_birth":
      return validateDateOfBirth(value);

    case "gender":
      return validateGender(value);

    case "baptized":
      return validateBaptized(value);

    case "membership_type":
      if (!value?.trim()) {
        return "Please select membership type";
      }

      return null;

    /* OPTIONAL */

    case "marital_status":
      return null;

    case "baptismal_date":
      return validateDate(
        value,
        "baptismal date"
      );

    case "emergency_contact_name":
      return null;

    case "emergency_contact_relationship":
      return null;

    case "emergency_contact_phone":
      if (!value?.trim()) {
        return null;
      }

      if (!isValidKenyanPhone(value)) {
        return "Please enter a valid Kenyan phone number";
      }

      return null;

    default:
      return null;
  }
};

/* -------------------------
   Validate Entire Payload
------------------------- */

export const validateMemberPayload = (
  payload
) => {
  const errors = {};

  const fields = [
    "full_name",
    "phone",
    "date_of_birth",
    "gender",
    "baptized",
    "membership_type",
    "marital_status",
    "baptismal_date",
    "emergency_contact_name",
    "emergency_contact_relationship",
    "emergency_contact_phone",
  ];

  for (const field of fields) {
    const error = validateMemberField(
      field,
      payload?.[field]
    );

    if (error) {
      errors[field] = error;
    }
  }

  if (Object.keys(errors).length > 0) {
     console.log(
    "❌ Member validation errors:",
    errors
  );
    const error = new Error(
      "Please correct the highlighted fields."
    );

    error.code = "VALIDATION_ERROR";
    error.statusCode = 400;
    error.details = errors;

    throw error;
  }

  return {
    full_name: payload.full_name.trim(),

    phone: normalizeKenyanPhone(
      payload.phone
    ),

    date_of_birth:
      payload.date_of_birth || null,

    gender:
      payload.gender?.trim().toLowerCase(),

    baptized:
  payload.baptized.trim().toLowerCase(),

    baptismal_date:
      payload.baptismal_date || null,

    marital_status:
      payload.marital_status?.trim() || null,

    membership_type:
      payload.membership_type.trim(),

    emergency_contact_name:
      payload.emergency_contact_name
        ?.trim() || null,

    emergency_contact_relationship:
      payload.emergency_contact_relationship
        ?.trim() || null,

    emergency_contact_phone:
      payload.emergency_contact_phone
        ? normalizeKenyanPhone(
            payload.emergency_contact_phone
          )
        : null,
  };
};