import { ARComponentBase } from '../ARComponentBase';

interface ARViewProps {
  onNavigateHome?: () => void;
}

export const KlosterweiherView = ({ onNavigateHome }: ARViewProps) => {
  return <ARComponentBase onNavigateHome={onNavigateHome} closeARViewKey="closeARView" />;
};
