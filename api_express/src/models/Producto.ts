import {Table,Column,Model,DataType,PrimaryKey,HasMany,} from "sequelize-typescript";
import Ajuste from "./Ajuste";
import DetallePedido from "./DetallePedido";

@Table({
  tableName: "PRODUCTO",
  timestamps: false,
})
export default class Producto extends Model<Producto> {
  @PrimaryKey
  @Column({type: DataType.STRING(10),allowNull: false,field: "cod_producto",})declare cod_producto: string;

  @Column({type: DataType.STRING(25),allowNull: false,field: "nom_producto",})declare nom_producto: string;

  @Column({type: DataType.INTEGER,allowNull: false,field: "precio_producto",})declare precio_producto: number;

  @Column({type: DataType.STRING(255),allowNull: true,field: "descripcion",})declare descripcion?: string;

  @Column({type: DataType.INTEGER,allowNull: false,defaultValue: 0,field: "stock_actual",})declare stock_actual: number;

  @Column({type: DataType.INTEGER,allowNull: false,defaultValue: 0,field: "stock_critico",})declare stock_critico: number;

  @Column({type: DataType.TINYINT,allowNull: false,defaultValue: 0,field: "estado",})declare estado: number;

  @HasMany(() => Ajuste, "cod_producto")declare ajustes?: Ajuste[];

  @HasMany(() => DetallePedido, "cod_producto")declare detalle_pedidos?: DetallePedido[];
}


