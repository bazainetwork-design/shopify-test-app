import { useLoading } from "../store/LoadingProvider";

export const GlobalLoading = () => {
  const { loading } = useLoading();
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.3)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
  };
  if (!loading) return null;

  return (
    <div style={styles.overlay}>
      <s-stack direction="block" gap="base" alignItems="center">
        <s-spinner accessibilityLabel="loading" size="large-100" />
        <s-text>正在加载，请稍候…</s-text>
      </s-stack>
    </div>
  );
};