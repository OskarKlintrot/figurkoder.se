import React from 'react'
import { Layout, Content, Footer } from 'react-mdl'
import Container from './container'
import Menu from './menu'
import CustomHeader from './customHeader'

const Master = (props) => {
  const { children } = props

  return(
    <Layout fixedHeader>
      <CustomHeader />
      <Menu />
      <Content>
        <Container>
          {children}
        </Container>
      </Content>
    </Layout>
  )
}

export default Master
