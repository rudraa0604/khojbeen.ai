export const CATEGORIES = [
  "Electronics",
  "Cards & IDs",
  "Books & Stationery",
  "Bottles & Flasks",
  "Keys & Locks",
  "Bags & Accessories",
  "Clothing",
  "Other"
];

export const LOCATIONS = [
  "Library",
  "Reading Hall",
  "Cafeteria",
  "Computer Lab",
  "Science Block",
  "Main Auditorium",
  "Sports Complex",
  "Parking Area",
  "Admin Block",
  "Classroom Block A",
  "Classroom Block B",
  "Other"
];

export function validateItemForm(values) {
  const errors = {};

  if (!values.title || values.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long.";
  } else if (values.title.trim().length > 80) {
    errors.title = "Title cannot exceed 80 characters.";
  }

  if (!values.description || values.description.trim().length < 10) {
    errors.description = "Please describe the item in at least 10 characters.";
  } else if (values.description.trim().length > 500) {
    errors.description = "Description cannot exceed 500 characters.";
  }

  if (!values.category || !CATEGORIES.includes(values.category)) {
    errors.category = "Please select a valid category.";
  }

  if (!values.location || !LOCATIONS.includes(values.location)) {
    errors.location = "Please select a campus location.";
  }

  if (!values.event_date) {
    errors.event_date = "Please select the date.";
  } else {
    const selectedDate = new Date(values.event_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      errors.event_date = "Date cannot be in the future.";
    }
  }

  if (!values.contact_name || values.contact_name.trim().length < 2) {
    errors.contact_name = "Please enter your name (at least 2 characters).";
  }

  if (!values.contact_email_or_phone || values.contact_email_or_phone.trim().length < 5) {
    errors.contact_email_or_phone = "Please provide a valid email or phone number.";
  }

  if (!values.agreed_terms) {
    errors.agreed_terms = "You must agree to the Terms and Privacy Policy.";
  }

  return errors;
}

export function validateClaimForm(values) {
  const errors = {};

  if (!values.claimant_name || values.claimant_name.trim().length < 2) {
    errors.claimant_name = "Please enter your full name.";
  }

  if (!values.claimant_contact || values.claimant_contact.trim().length < 5) {
    errors.claimant_contact = "Please provide your campus email or phone number.";
  }

  if (!values.proof_text || values.proof_text.trim().length < 15) {
    errors.proof_text = "Please describe proof of ownership in at least 15 characters (e.g. hidden markings, contents, or serial number).";
  }

  if (!values.agreed_terms) {
    errors.agreed_terms = "You must confirm this is a genuine claim under our Terms.";
  }

  return errors;
}
