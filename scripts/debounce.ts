export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Args): void => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}
