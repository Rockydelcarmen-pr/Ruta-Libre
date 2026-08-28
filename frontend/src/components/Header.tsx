import { Brand } from "./Brand";

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Brand />
      </div>
    </header>
  );
}
