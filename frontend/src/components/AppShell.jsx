import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Navbar, 
  Group, 
  Text, 
  createStyles, 
  getStylesRef, 
  rem, 
  AppShell as MantineAppShell, 
  Header, 
  MediaQuery, 
  Burger, 
  useMantineTheme,
  Title,
  Tooltip,
  ActionIcon,
  Box
} from '@mantine/core';
import { 
  IconHome, 
  IconMessage, 
  IconSettings, 
  IconDatabase, 
  IconChartBar,
  IconBook,
  IconFolder,
  IconBrain,
  IconChevronLeft,
  IconChevronRight,
  IconMenu2
} from '@tabler/icons-react';

const useStyles = createStyles((theme) => ({
  navbar: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'width 0.3s ease, min-width 0.3s ease, transform 0.3s ease',
    position: 'relative'
  },

  header: {
    paddingBottom: theme.spacing.md,
    marginBottom: `calc(${theme.spacing.md} * 1.5)`,
    borderBottom: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
    }`,
  },

  footer: {
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderTop: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
    }`,
  },

  link: {
    ...theme.fn.focusStyles(),
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    fontSize: theme.fontSizes.sm,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[7],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontWeight: 500,

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
      color: theme.colorScheme === 'dark' ? theme.white : theme.black,

      [`& .${getStylesRef('icon')}`]: {
        color: theme.colorScheme === 'dark' ? theme.white : theme.black,
      },
    },
  },

  linkIcon: {
    ref: getStylesRef('icon'),
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    marginRight: theme.spacing.sm,
  },

  linkActive: {
    '&, &:hover': {
      backgroundColor: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).background,
      color: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).color,
      [`& .${getStylesRef('icon')}`]: {
        color: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).color,
      },
    },
  },

  collapsedNavbar: {
    width: '80px !important',
    minWidth: '80px !important',
  },

  collapsedNavbarLabel: {
    display: 'none',
  },

  collapseButton: {
    position: 'absolute',
    top: '50%',
    right: -15,
    transform: 'translateY(-50%)',
    zIndex: 1000,
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    backgroundColor: theme.colors.blue[5],
    color: 'white',
    border: `1px solid ${theme.colors.blue[5]}`,
    borderRadius: '50%',
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.3s',
    '&:hover': {
      backgroundColor: theme.colors.blue[6],
    },
  },
}));

const data = [
  { link: '/', label: 'Accueil', icon: IconHome },
  { link: '/chat', label: 'Chat', icon: IconMessage },
  { link: '/saved', label: 'Conversations', icon: IconFolder },
  { link: '/rag', label: 'Système RAG', icon: IconDatabase },
  { link: '/rag-documentation', label: 'Documentation RAG', icon: IconBook },
  { link: '/tokens', label: 'Utilisation Tokens', icon: IconChartBar },
  { link: '/settings', label: 'Paramètres', icon: IconSettings },
];

const NavbarSimple = ({ collapsed, toggleNavbar }) => {
  const { classes, cx } = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);

  const links = data.map((item) => (
    <Tooltip 
      label={item.label} 
      position="right" 
      disabled={!collapsed}
      withArrow
      key={item.label}
    >
      <a
        className={cx(classes.link, { [classes.linkActive]: item.link === active })}
        href={item.link}
        onClick={(event) => {
          event.preventDefault();
          setActive(item.link);
          navigate(item.link);
        }}
      >
        <item.icon className={classes.linkIcon} stroke={1.5} />
        <span className={cx({ [classes.collapsedNavbarLabel]: collapsed })}>
          {item.label}
        </span>
      </a>
    </Tooltip>
  ));

  return (
    <Navbar 
      width={{ sm: 300 }} 
      p="md" 
      className={cx(classes.navbar, { [classes.collapsedNavbar]: collapsed })}
    >
      <div className={classes.collapseButton} onClick={toggleNavbar} title={collapsed ? "Déplier le menu" : "Replier le menu"}>
        {collapsed ? <IconChevronRight size={16} color="white" /> : <IconChevronLeft size={16} color="white" />}
      </div>
      
      <Navbar.Section grow>
        <Group className={classes.header} position="apart">
          <Group spacing="xs">
            <IconBrain size={24} color="#1890FF" />
            {!collapsed && (
              <Title order={3} size="h4" fw={600} c="blue.6">
                TurboChat
              </Title>
            )}
          </Group>
        </Group>
        {links}
      </Navbar.Section>

      {!collapsed && (
        <Navbar.Section className={classes.footer}>
          <Text size="xs" color="dimmed" align="center">
            TurboChat v1.0 - Edition Complète
          </Text>
        </Navbar.Section>
      )}
    </Navbar>
  );
};

const AppShell = ({ children }) => {
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);

  const toggleNavbar = () => {
    setNavbarCollapsed(prev => !prev);
  };

  return (
    <MantineAppShell
      navbarOffsetBreakpoint="sm"
      navbar={
        <Navbar
          p={navbarCollapsed ? "xs" : "md"}
          hiddenBreakpoint="sm"
          hidden={!opened}
          width={{ sm: navbarCollapsed ? 80 : 300, lg: navbarCollapsed ? 80 : 300 }}
          style={{ overflow: 'visible' }}
        >
          <NavbarSimple collapsed={navbarCollapsed} toggleNavbar={toggleNavbar} />
        </Navbar>
      }
      header={
        <Header height={{ base: 50, md: 70 }} p="md">
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size="sm"
                color={theme.colors.gray[6]}
                mr="xl"
              />
            </MediaQuery>
            <Group spacing="xs">
              <IconBrain size={24} color="#1890FF" />
              <Text fw={600}>TurboChat</Text>
            </Group>
            
            <Box ml="auto">
              <ActionIcon 
                variant="filled" 
                onClick={toggleNavbar}
                title={navbarCollapsed ? "Déplier le menu" : "Replier le menu"}
                size="lg"
                color="blue"
              >
                {navbarCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
              </ActionIcon>
            </Box>
          </div>
        </Header>
      }
      styles={(theme) => ({
        main: { 
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
          transition: 'padding-left 0.3s ease'
        },
      })}
    >
      {children}
    </MantineAppShell>
  );
};

export default AppShell; 