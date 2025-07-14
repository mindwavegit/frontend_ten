export function getParams(data: { [key: string]: string | number }) {
  if (data) {
    return (
      Object.keys(data)
        ?.map((key) => `${key}=${data?.[key]}`)
        ?.join("&") || ""
    );
  } else {
    return "";
  }
}
