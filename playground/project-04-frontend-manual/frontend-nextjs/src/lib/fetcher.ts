const API_BASE_URL = "https://jsonplaceholder.typicode.com";

export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${url}`);

  if (!response.ok) {
    throw new Error("An error occurred while fetching the data.");
  }

  return response.json();
};
