// app/services/docstringService.ts

export async function generateDocstring(formData: FormData) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/generate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate docstring');
    }
    console.log(response.json())

    return await response.json();
  } catch (error) {
    console.error('Error in generateDocstring:', error);
    throw error;
  }
}
