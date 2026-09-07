const pages: Record<string, string> = {
  "/": "This is dashboard",
  "/booking": "This is booking",
};

export default function App() {
  const content = pages[window.location.pathname] ?? "Page not found";

  return <main>{content}</main>;
}
