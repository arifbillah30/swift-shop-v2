import * as dayjs from "dayjs";

const showTimeFormat = (data, timeFormat) => {
  if (!data || data === 'Invalid Date') {
    return 'N/A';
  }
  return dayjs(data).format(timeFormat || "h:mm A");
};

const showDateFormat = (data, dateFormat) => {
  if (!data || data === 'Invalid Date') {
    return 'N/A';
  }
  return dayjs(data).format(dateFormat || "MMM D, YYYY");
};

const showDateTimeFormat = (data, date, time) => {
  // Use default format if date format is not provided
  const dateFormat = date || "MMM D, YYYY";
  const timeFormat = time || "h:mm A";
  
  // Validate data
  if (!data || data === 'Invalid Date') {
    return 'N/A';
  }
  
  return dayjs(data).format(`${dateFormat} ${timeFormat}`);
};

export { showTimeFormat, showDateFormat, showDateTimeFormat };
