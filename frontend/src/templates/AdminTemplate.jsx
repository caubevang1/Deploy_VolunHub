import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    SnippetsOutlined,
    FileAddOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { GetUserInfo } from '../services/UserService';
import dhcn from '../assets/img/Logo_UET.webp';
import admin from '../assets/img/Admin.png';
import { removeLocalStorage } from '../utils/Configs';
import { LOCALSTORAGE_USER } from '../utils/Constants';

const { Header, Sider, Content } = Layout;

export default function AdminTemplate() {
    const [collapsed, setCollapsed] = useState(false);
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchUserInfo = async () => {
            try {
                const res = await GetUserInfo();
                const userData = res.data?.body || res.data?.content || res.data;

                if (!mounted) return;

                if (userData.role !== 'ADMIN') {
                    removeLocalStorage(LOCALSTORAGE_USER);
                    window.location.href = '/';
                } else {
                    setUserInfo(userData);
                }
            } catch (error) {
                console.error('Admin auth error:', error);
                if (mounted) {
                    removeLocalStorage(LOCALSTORAGE_USER);
                    window.location.href = '/';
                }
            }
        };

        fetchUserInfo();
        return () => { mounted = false; };
    }, []);

    const menuItems = [
        {
            type: 'group',
            label: <span className="text-white font-semibold ">TRANG CHỦ</span>,
            children: [
                {
                    key: 'dashboard',
                    icon: <AppstoreOutlined />,
                    label: <NavLink to='dashboard'>Dashboard</NavLink>,
                },
            ],
        },
        {
            type: 'group',
            label: <span className="text-white font-semibold ">HOẠT ĐỘNG</span>,
            children: [
                {
                    key: 'user-manager',
                    icon: <UserOutlined />,
                    label: <NavLink to='nguoi-dung'>Quản lý người dùng</NavLink>,
                },
                {
                    key: 'event-manager',
                    icon: <SnippetsOutlined />,
                    label: 'Quản lý sự kiện',
                    children: [
                        {
                            key: 'all-events',
                            icon: <FileAddOutlined />,
                            label: <NavLink to='su-kien'>Tất cả sự kiện</NavLink>,
                        },
                        {
                            key: 'pending-events',
                            icon: <FileAddOutlined />,
                            label: <NavLink to='su-kien/cho-duyet'>Sự kiện chờ duyệt</NavLink>,
                        }
                    ]
                },
            ],
        },
    ];

    const location = useLocation();

    const getMenuKeys = () => {
        const path = location.pathname;

        if (path.startsWith('/admin/su-kien')) {
            return {
                selected: path.includes('/cho-duyet') ? 'pending-events' : 'all-events',
                open: ['event-manager']
            };
        }
        if (path.startsWith('/admin/nguoi-dung')) {
            return { selected: 'user-manager', open: [] };
        }
        // Default case for dashboard or other routes
        return { selected: 'dashboard', open: [] };
    };

    const { selected: selectedKey, open: defaultOpenKey } = getMenuKeys();

    return (
        <Layout className="!min-h-screen ">
            <Sider trigger={null} collapsible collapsed={collapsed} width={250}>
                <div className="flex flex-col h-full justify-between pb-4">

                    {/* --- PHẦN TRÊN: LOGO + MENU --- */}
                    <div>
                        <NavLink to='/' className="flex items-center justify-center p-2">
                            <img
                                src={dhcn}
                                alt="Logo UET"
                                className=" w-[85px] h-auto rounded-full object-cover transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_8px_rgba(24,144,255,0.6)] mt-3 mb-4"
                            />
                        </NavLink>

                        <Menu
                            key={selectedKey} // Force re-mount with new defaults when selection changes
                            theme="dark"
                            mode="inline"
                            defaultSelectedKeys={[selectedKey]}
                            defaultOpenKeys={defaultOpenKey}
                            items={menuItems}
                            className="mt-4"
                        />
                    </div>

                    {/* --- PHẦN DƯỚI: ẢNH ADMIN --- */}
                    <div className="flex flex-col items-center justify-center gap-2 transition-all duration-300">
                        <img
                            src={admin}
                            alt="Admin Avatar"
                            className={` transition-all duration-300 ${collapsed ? 'w-10 h-auto' : 'w-full h-auto'}`}
                        />
                    </div>

                </div>
            </Sider>

            <Layout className="site-layout ">
                <Header className="site-layout-background !pl-4 text-[1.8rem] !bg-white shadow-sm flex items-center">
                    {React.createElement(
                        collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
                        {
                            className: 'trigger hover:text-blue-500 transition-colors cursor-pointer',
                            onClick: () => setCollapsed(!collapsed),
                        }
                    )}
                </Header>

                <Content
                    className="site-layout-background contentAdmin bg-white"
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 500,
                        borderRadius: '8px'
                    }}
                >
                    <Outlet context={userInfo} />
                </Content>
            </Layout>
        </Layout>
    );
}