import React from 'react';
import { Navigation, Drawer } from 'react-mdl';

const Menu = () =>{
    return(
      <Drawer title="Meny">
        <Navigation>
          <a href="">Hem</a>
          <a href="">Om sidan</a>
          <a href="">Vanliga frågor</a>
          <a href="">Kontakta mig</a>
        </Navigation>
      </Drawer>
    );
};

export default Menu;
