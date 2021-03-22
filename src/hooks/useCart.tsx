import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const itemStock = await api.get(`stock/${productId}`)

      const productInCartIndex = cart.findIndex(product => product.id === productId)

      if (itemStock.data.amount > 0) {

        if (productInCartIndex < 0) {
          const { data } = await api.get(`products/${productId}`)
          setCart([...cart, {...data, amount: 1}])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...data, amount: 1}]))
        } else if (itemStock.data.amount - (cart[productInCartIndex].amount + 1) > -1) {
          const updatedCart = cart.map(product => product.id === productId 
            ? {...product, amount: product.amount + 1 } 
            : product
          )
  
          setCart(updatedCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch(err) {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId)

      if (!productExists) {
        throw new Error('Product does not exists')
      }

      const updatedCart = cart.filter(product => product.id !== productId)

      setCart(updatedCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const { data } = await api.get(`stock/${productId}`)

      if (data.amount - amount >= 0) {
        const updatedCart = cart.map(product => product.id === productId 
          ? { ...product, amount }
          : product
        )

        setCart(updatedCart)

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        toast.error('Quantidade solicitada fora de estoque')
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
