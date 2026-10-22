import { BuilderApp } from '@/components/builder/BuilderApp';
import { TextureProvider } from '@/components/preview/textures/TextureProvider';

export default function HomePage() {
  return (
    <TextureProvider>
      <BuilderApp />
    </TextureProvider>
  );
}
