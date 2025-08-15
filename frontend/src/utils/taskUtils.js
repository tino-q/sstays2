// Shared task formatting utilities

export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return "N/A";
  return new Date(dateTimeString).toLocaleString();
};

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
};

export const formatTaskType = (taskType) => {
  if (!taskType) return "N/A";
  return taskType.charAt(0).toUpperCase() + taskType.slice(1);
};

export const formatTruncatedId = (id, length = 8) => {
  if (!id) return "N/A";
  return `${id.substring(0, length)}...`;
};

export const formatDescription = (description, maxLength = 100) => {
  if (!description) return "N/A";
  return description.length > maxLength 
    ? `${description.substring(0, maxLength)}...`
    : description;
};