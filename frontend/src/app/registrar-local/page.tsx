import FormularioRegistroLocal from '@/components/FormularioRegistroLocal';

export default function RegistrarLocalPage() {
  return (
    <div className="contenedor py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-morado-900 mb-1">Registra tu local</h1>
      <p className="text-morado-600 mb-6">
        Completa tus datos y los del local. Un operador verificará la información antes de
        publicarlo.
      </p>
      <FormularioRegistroLocal />
    </div>
  );
}
