import { redirect } from "next/navigation";

/**
 * O cadastro/lista de mensalidades passou a viver em /catalogo (junto com
 * produto e serviço — ver ItemCatalogo no schema). Esta rota continua
 * existindo só como redirecionamento, pra não quebrar links/favoritos
 * antigos; /planos/[id] (detalhe/assinantes) continua funcionando normal.
 */
export default function PlanosPage() {
  redirect("/catalogo");
}
