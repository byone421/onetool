interface ToolHeaderProps {
  title: string;
  description: string;
}

export const ToolHeader = ({ title, description }: ToolHeaderProps) => (
  <div className="tool-header">
    <h1>{title}</h1>
    <p>{description}</p>
  </div>
);
