//swift-shop-v2/Admin/src/components/product/ProductTable.js

import {
  Avatar,
  Badge,
  TableBody,
  TableCell,
  TableRow,
} from "@windmill/react-ui";
import CheckBox from "components/form/CheckBox";
import EditDeleteButton from "components/table/EditDeleteButton";
import ShowHideButton from "components/table/ShowHideButton";
import Tooltip from "components/tooltip/Tooltip";
import { t } from "i18next";
import { FiZoomIn } from "react-icons/fi";
import { Link } from "react-router-dom";
import { showingTranslateValue } from "utils/translate";

//internal import

const ProductTable = ({ products, isCheck, setIsCheck, currency, lang, handleUpdate, handleModalOpen }) => {

  const handleClick = (e) => {
    const { id, checked } = e.target;
    console.log("id", id, checked);

    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  // Safety check for products array
  if (!products || !Array.isArray(products)) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan="10" className="text-center">
            No products found
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <>
      <TableBody>
        {products.map((product, i) => (
          <TableRow key={i + 1}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name={product?.name || product?.title?.en || 'Unknown Product'}
                id={product.id || product._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(product.id || product._id)}
              />
            </TableCell>

            <TableCell>
              <div className="flex items-center">
                {(product?.primary_image || product?.image?.[0]) ? (
                  <Avatar
                    className="hidden p-1 mr-2 md:block bg-gray-50 shadow-none"
                    src={product?.primary_image || product?.image?.[0]}
                    alt="product"
                  />
                ) : (
                  <Avatar
                    src={`https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png`}
                    alt="product"
                  />
                )}
                <div>
                  <h2 className="text-sm font-medium">
                    {(product?.name || showingTranslateValue(product?.title, lang))?.substring(0, 28) || 'Unknown Product'}
                  </h2>
                </div>
              </div>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {product?.category_name || showingTranslateValue(product?.category?.name, lang) || 'No Category'}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm font-semibold">
                {currency}
                {Number(product?.price || product?.prices?.originalPrice || 0).toFixed(2)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm font-semibold">
                {currency}
                {Number(product?.price || product?.prices?.price || 0).toFixed(2)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm">{product.total_stock || product.stock || 0}</span>
            </TableCell>
            <TableCell>
              {(product.total_stock || product.stock || 0) > 0 ? (
                <Badge type="success">{t("Selling")}</Badge>
              ) : (
                <Badge type="danger">{t("SoldOut")}</Badge>
              )}
            </TableCell>
            <TableCell>
              <Link
                to={`/product/${product.id || product._id}`}
                className="flex justify-center text-gray-400 hover:text-green-600"
              >
                <Tooltip
                  id="view"
                  Icon={FiZoomIn}
                  title={t("DetailsTbl")}
                  bgColor="#10B981"
                />
              </Link>
            </TableCell>
            <TableCell className="text-center">
              <ShowHideButton id={product.id || product._id} status={product.status} />
            </TableCell>
            <TableCell>
              <EditDeleteButton
                id={product.id || product._id}
                product={product}
                isCheck={isCheck}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                title={product?.name || showingTranslateValue(product?.title, lang) || 'Unknown Product'}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default ProductTable;
