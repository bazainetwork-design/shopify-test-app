import { useLoading } from '../contexts/LoadingProvider';

export default function GlobalLoading() {
  const { loading } = useLoading();
  console.log('loading=', loading);

  if (!loading) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999999,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "rgba(255,255,255,.5)",
    }}>
      <s-spinner />
    </div>
  )
}