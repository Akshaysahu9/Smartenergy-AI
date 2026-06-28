import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  badge?: ReactNode;
}

export function PageHeader({ title, description, badge }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-theme">{title}</h1>
        {description && <p className="mt-1 text-sm text-theme-muted">{description}</p>}
      </div>
      {badge}
    </div>
  );
}
