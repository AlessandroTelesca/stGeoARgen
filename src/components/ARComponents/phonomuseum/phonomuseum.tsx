import { ARComponentBase } from '../ARComponentBase';

interface ARViewProps {
  onNavigateHome?: () => void;
}

export const PhonomuseumView = ({ onNavigateHome }: ARViewProps) => {
  return <ARComponentBase onNavigateHome={onNavigateHome} closeARViewKey="closePhonomuseumView" />;
};
